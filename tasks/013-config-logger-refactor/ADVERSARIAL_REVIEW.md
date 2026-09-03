# Adversarial Review — Рефакторинг ConfigLogger и выравнивание уровней логирования

Прогон: короткий, враждебный, без подъёма uvicorn (эндпоинты не затронуты рефакторингом).
Сервер не поднимался — проверены только `config_log.py`, `logging_config.yaml`,
поведение стандартного модуля `logging` при импорте/реинстанцировании.
Все эксперименты — в копиях приложения в `/tmp/adv_scratch/` (репозиторий не менялся).
uvicorn не поднимался (pgrep чист), гасить нечего.

## ADV-001: logging.basicConfig после импорта config_log восстанавливает корневой StreamHandler и ломает контракт «root handlers = []»

- Session: Рефакторинг ConfigLogger и выравнивание уровней логирования
- Suggested severity: MEDIUM

What I did:
```python
# cd fastapi-application
from config_log import logF, logFC            # dictConfig → root level=WARNING, handlers=[]
import logging
logging.basicConfig(level=logging.DEBUG, format="BASIC:%(levelname)s:%(name)s:%(message)s")
# → корень получил <StreamHandler <stderr> (NOTSET)>, level=10 (DEBUG)
logF.info("MARKER")                           # OnlyFile handlers не изменились, но…
logFC.warning("MARKER2")                      # FileStdout WARNING пропагирует в root и
                                              # печатается БАЗОВЫМ хендлером второй раз
```

Expected:
Контракт REQUIREMENTS.md «root handlers = []» формально держится, пока никто не зовёт
`basicConfig`. Если какой-то модуль/тест/утилита вызывает `basicConfig` (а это типичный
паттерн при `import logging; logging.basicConfig(...)`), контракт молча ломается:
WARNING+ записи `FileStdout` начинают дублироваться в stderr, плюс root.level
падает до DEBUG.

Actual (stdout):
```
[EXP3a] BEFORE basicConfig: root level/handlers = 30 []
[EXP3a] AFTER  basicConfig: root level/handlers = 10 [<StreamHandler <stderr> (NOTSET)>]
BASIC:INFO:OnlyFile:EXP3a_INFO                     ← дубль OnlyFile.INFO в stderr
2026-09-03 23:55:52,746 ...  WARNING: EXP3a_WARNING_FC   ← FileStdout WARNING через свой console1
BASIC:WARNING:FileStdout:EXP3a_WARNING_FC          ← и дубль через базовый root handler
```

Notes:
«Вне рамок» явно не упоминает защиту от `basicConfig` после импорта. Это
документированный контракт уязвим: достаточно одной строки в любом месте
проекта (или в middleware uvicorn, которое в реальности так не делает, но
любая сторонняя либа — может) — и искажается и root.level, и root.handlers.

Screenshot: нет (CLI-only).

Disposition: REJECTED - контракт задания не требует защиты от внешнего вызова basicConfig; в кодовой базе нет ни одного вызова (grep basicConfig по *.py — пусто). Гипотетический вред от сторонней библиотеки — поведение Python stdlib, а не дефект данного рефакторинга; в рамки задания не входит.

---

## ADV-002: переинстанцирование ConfigLogger в одном процессе НЕ дублирует хендлеры — но ломает ожидаемое разделение «модульный инстанс vs локальный»

- Session: Рефакторинг ConfigLogger и выравнивание уровней логирования
- Suggested severity: LOW

What I did:
```python
import config_log as cl
from config_log import logF                                   # первый инстанс
cl2 = cl.ConfigLogger(log_dir="./log", log_file="one_fast.log")  # второй инстанс
logF_after = logging.getLogger("OnlyFile")
print(len(logF_after.handlers), logF.handlers[0] is logF_after.handlers[0])
```

Expected: кто-то может ожидать, что второй инстанс добавит второй
`RotatingFileHandler` к `OnlyFile` (т.к. `ConfigLogger.__init__` зовёт
`dictConfig` без явной очистки списка хендлеров у уже существующих логгеров).

Actual:
```
[EXP1] before 2nd instance: OnlyFile handlers len = 1
[EXP1] rotating_file1 in handlers? True
[EXP1] after  2nd instance: OnlyFile handlers len = 1
[EXP1] are they the SAME handler object? True
[EXP1] root level/handlers: 30 []
```

Notes:
`dictConfig` с `disable_existing_loggers: False` корректно переустанавливает
хендлеры (на самом деле сохраняет прежний объект handler, потому что
`disable_existing_loggers: False` не дропает их, но `dictConfig` всё равно
чистит и заново навешивает). Дублей не возникает — это плюс.
НО: `logF` из первого импорта и `logging.getLogger("OnlyFile")` после второго
инстанцирования указывают на один и тот же handler объект, но имя файла
внутри `RotatingFileHandler` остаётся прежним (используется
`BASE_DIR / "log" / "one_fast.log"`), а не «log_file» второго инстанса.
Если пользовательский код ради «другой файл» вызовет `ConfigLogger(..., log_file="X")`,
его ожидание не сработает.

Disposition: REJECTED - REQUIREMENTS.md прямо фиксирует: «ConfigLogger никем не инстанцируется извне» и публичный API — один модульный инстанс с one_fast.log. Ожидание «второй инстанс переконфигурирует файл» контракт не предполагает; хендлеры не дублируются, целостность конфигурации сохранена. Задача рефакторинга — не сделать класс потокобезопасным мультиинстанс-менеджером.

---

## ADV-003: импорт config_log без logging_config.yaml или с битым YAML валит всё приложение необработанным исключением

- Session: Рефакторинг ConfigLogger и выравнивание уровней логирования
- Suggested severity: MEDIUM

What I did:
```bash
mkdir -p /tmp/adv_scratch/app_broken_yaml
cp -r fastapi-application /tmp/adv_scratch/app_broken_yaml
rm /tmp/adv_scratch/app_broken_yaml/logging_config.yaml
# или:
echo 'garbage: : : :' > /tmp/adv_scratch/app_bad_yaml/logging_config.yaml
PYTHONPATH=/tmp/adv_scratch/app_broken_yaml python -c 'import config_log'
```

Expected:
Хотя бы INFO-лог в stderr через дефолтный `lastResort`-хендлер + понятная
ошибка; приложение должно иметь шанс отказаться от импорта и сообщить
пользователю, что конфиг битый.

Actual (stdout):
```
# удалён logging_config.yaml
IMPORT_FAIL: FileNotFoundError FileNotFoundError(2, 'No such file or directory')

# битый yaml
IMPORT_FAIL: ScannerError ScannerError(None, None, 'mapping values are not allowed here', <yaml.error.Mark object at 0x...>)
```

Notes:
`_load_logging_config` вызывается в `__init__` модуля — на самом раннем
этапе импорта. Любой `FileNotFoundError` или `yaml.YAMLError`
взрывает `import main` ещё до того, как FastAPI-приложение собрано.
Текущий код в `config_log.py` не имеет ни try/except, ни fallback на
`basicConfig` (его убрали специально по решению задания), ни INFO-сообщения
через `lastResort`. То есть любой повреждённый коммит `logging_config.yaml`
= нерабочее приложение в проде без диагностики.

Disposition: REJECTED - отсутствие YAML-конфига — повреждение файла конфигурации, а не дефект кода: поведение одинаково и до рефакторинга (удаление logging_config.yaml валило import так же — FileNotFoundError/ScannerError в _load_logging_config). Требование фолббэка/try-except в контракте отсутствует; ни один критерий успеха не нарушен.

---

## ADV-004: ConfigLogger без `parents=True`/`exist_ok=True` падает на любом вложенном пути

- Session: Рефакторинг ConfigLogger и выравнивание уровней логирования
- Suggested severity: LOW

What I did:
```python
ConfigLogger(log_dir="/tmp/adv_scratch/no_parent_dir/sub/deep", log_file="cust.log")
```

Expected:
Заявлено «Вне рамок» — оставить `os.mkdir` без `parents/exist_ok` как есть.
Это сознательное решение. Но фиксирую, что **поведение неочевидно**:
модульный инстанс всегда создаёт `./log` рядом с `BASE_DIR` — это работает,
потому что `BASE_DIR` уже существует. Если кто-то решит передать
`log_dir="./my-logs"` (без `./`), то `_create_log_dir` будет пытаться
создать `BASE_DIR / "./my-logs"` — здесь `./` означает «родитель
существует», поэтому сработает. А вот `log_dir="my-logs/nested"` —
упадёт, потому что `os.mkdir` без `exist_ok` и `parents` не создаёт
промежуточные каталоги.

Actual:
```
EXP7a OK (одноуровневый путь создаётся)
EXP7b OK (если путь уже есть — никакой ошибки, os.path.exists check)
EXP7c FileNotFoundError (вложенный путь — реальный os.mkdir bug)
```

Notes:
«Вне рамок» явно это фиксирует, так что severity LOW. Просто наблюдение:
поведение чувствительно к форме `log_dir` (с `./` или без) и количеству
уровней вложенности.

Disposition: REJECTED - зафиксировано в REQUIREMENTS.md «Вне рамок»: «Оставить os.mkdir без parents=True/exist_ok=True (текущее поведение)». Сознательное решение спеки, поведение унаследовано из старого кода без изменений.

---

## ADV-005: именованные логгеры в YAML не объявляют propagate=False — запись WARNING+ от FileStdout рискует задать root, если кто-то подключит туда хендлер

- Session: Рефакторинг ConfigLogger и выравнивание уровней логирования
- Suggested severity: LOW

What I did:
```python
# After fresh import — root: handlers=[], level=WARNING
logFC = logging.getLogger("FileStdout")
print(logFC.propagate, logFC.parent)   # True → RootLogger
```

Expected:
Решение задания: «root handlers = []», поэтому propagate=True сейчас
безопасен — ничего не выводится дважды. Контракт соблюдён.

Actual:
```
[EXP2] uvicorn.access parent chain ends at: <RootLogger root (WARNING)> None
[EXP3a] OnlyFile handlers: [<RotatingFileHandler ...>]
logFC.propagate == True
```

Notes:
Это **гипотеза** (не воспроизводится в текущем коде, потому что
`basicConfig` ADV-001 — единственный способ добавить что-то в root).
Если кто-то добавит `propagate: False` явно — будет ломать контракт;
если не добавит, то ADV-001 уже достаточен, чтобы сломать. Фиксирую
как контекстно-зависимое наблюдение.

Disposition: REJECTED - REQUIREMENTS.md «Подтверждённые решения» прямо задают propagate по умолчанию True как часть контракта («Пропагация именованных логгеров остаётся по умолчанию True»). Находка сама помечена как гипотеза, не воспроизводимая в текущем коде. Дефекта нет.

---

## ADV-006: cwd не влияет на расположение логов (BASE_DIR привязан к файлу модуля) — это правильно

- Session: Рефакторинг ConfigLogger и выравнивание уровней логирования
- Suggested severity: LOW (INFORM)

What I did:
```python
os.chdir("/")
import config_log
print(config_log.logF.handlers[0].baseFilename)
config_log.logF.info("MARKER_FROM_ROOT_CWD")
```

Expected:
Согласно `base_dir_path.py::BASE_DIR = Path(__file__).resolve().parent`
— лог-файл всегда оказывается в `fastapi-application/log/one_fast.log`,
независимо от cwd.

Actual:
```
[EXP6] CWD= /
[EXP6] logF.handlers[0].baseFilename= /tmp/adv_scratch/app_cwd_test/log/one_fast.log
[EXP6] file exists at: True
[EXP6] parent dir exists at: True
```

Notes:
В отличие от SQLite (`sqlite+aiosqlite:///./one_simple.db` — резолвится
от cwd и описан в «Граблях»), путь логов жёстко привязан к `BASE_DIR`.
Это положительное наблюдение: в требованиях указано `BASE_DIR / DEFAULT_LOG_DIR`,
контракт выдержан. Записываю как «всё хорошо», потому что иначе это
типичная грабля, которую легко пропустить.

Disposition: REJECTED - не находка, а позитивное наблюдение: контракт `BASE_DIR / DEFAULT_LOG_DIR` подтверждён, критерий 10 пройден qa. Дефекта нет, DEF-запись не требуется.

---

## Сводка

- Экспериментов: 8 (EXP1, EXP2/EXP2b, EXP3/EXP3a, EXP4, EXP5, EXP6, EXP7a/b/c, EXP8).
- Находок: 6 (ADV-001…ADV-006).
- Сервер не поднимался — `pgrep -af "uvicorn.*main:main_app"` чист; гасить нечего.
- Репозиторий не менялся; эксперименты — только в `/tmp/adv_scratch/`.

Триаж оркестратора (2026-09-03): все 6 записей REJECTED — ни одна не нарушает
контракт REQUIREMENTS.md (basicConfig и мультиинстанс — вне рамок, mkdir и
propagate зафиксированы в «Вне рамках»/«Подтверждённых решениях», битый YAML —
деградация окружения, не дефект кода, ADV-006 — позитивное наблюдение).
DEF-записи не заводились. PENDING не осталось.