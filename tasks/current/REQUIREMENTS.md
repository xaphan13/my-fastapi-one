# Рефакторинг ConfigLogger и выравнивание уровней логирования

Превратить `ConfigLogger` из набора статических методов с мёртвыми атрибутами и ленивой веткой в полноценный класс-инстанс, заодно убрав `logging.basicConfig` и перенеся настройку root-логгера в YAML, а также выровняв уровни логгеров и хендлеров по INFO.

## Подтверждённые решения

- **Вариант B — «настоящий» класс.** `ConfigLogger` становится классом с `__init__(self, log_dir: str, log_file: str)`. Создание каталога и применение `dictConfig` выполняются в `__init__`. На уровне модуля создаётся один инстанс с файлом `one_fast.log`. Публичный метод `get_logger(self, nameBase: str)` — инстанс-метод; docstring про `OnlyFile`/`Stdout`/`FileStdout` сохраняется. Убираются: статические методы, флаг `isSetting`, ленивая ветка в `get_logger`, мёртвые атрибуты `pathDir_default`/`nameFile_default` класса. Дефолты `"./log"` и `"example.log"` — константы модуля в одном месте. Экспорты `logF`/`logFC` и побочный эффект настройки на импорте (`one_fast.log`) сохраняются.
- **root в YAML, basicConfig удалить.** В `logging_config.yaml` добавляется секция `root: {level: WARNING, handlers: []}`. Из `config_log.py` удаляется строка `logging.basicConfig(level=logging.INFO, handlers=[])`. Контракт: root level = WARNING, root handlers = []. Пропагация именованных логгеров (`Stdout`, `FileStdout`, `OnlyFile`) остаётся по умолчанию `True`; из-за порога root WARNING дублирования записей INFO не возникает, а записи WARNING+ от этих логгеров, попадая в root, не выводятся, потому что у root пустой список хендлеров.
- **Способ 1 — выровнять уровни.** В `logging_config.yaml` у логгеров `Stdout`, `FileStdout`, `OnlyFile` уровень меняется с `DEBUG` на `INFO`. Хендлеры уже `INFO`. Семантика: «пишем INFO и выше», двойного чтения уровней нет.

## Результат

- `fastapi-application/config_log.py` — класс `ConfigLogger` в виде инстанса, константы `DEFAULT_LOG_DIR`/`DEFAULT_LOG_FILE`, метод `__init__` с созданием каталога и `dictConfig`, метод `get_logger`, функция `_load_logging_config`, экспорты `logF`/`logFC`, создание инстанса на уровне модуля с файлом `one_fast.log`.
- `fastapi-application/logging_config.yaml` — секция `root` с `level: WARNING` и пустыми `handlers`, у логгеров `Stdout`/`FileStdout`/`OnlyFile` уровень `INFO`.
- Соседние модули продолжают работать без изменений: весь проект импортирует только `from config_log import logF` (реже `logFC`), `ConfigLogger` никем не инстанцируется извне.

## Вне рамок

- Оставить `os.mkdir` без `parents=True`/`exist_ok=True` (текущее поведение).
- Не добавлять `delay=True`, ротацию для multi-worker, не переносить настройки лога в `core/config.py` (`Settings`).
- Не раскомментировать uvicorn-секции в YAML.
- Не удалять и не изменять экспорт `logFC`.
- Не менять стиль комментариев-разделителей и русский язык docstring.
- Не трогать `content_art/` и другие домены.

## План фаз

| # | Фаза | Исполнитель | Файлы | Контракт | Checkpoint | Бюджет ходов |
|---|---|---|---|---|---|---|
| 1 | Рефакторинг ConfigLogger и YAML | backend-dev | `fastapi-application/config_log.py`, `fastapi-application/logging_config.yaml` | `ConfigLogger` — инстанс с `__init__(log_dir, log_file)` и `get_logger(nameBase)`; `logF`/`logFC` экспортируются; YAML содержит `root: {level: WARNING, handlers: []}`; логгеры `Stdout`/`FileStdout`/`OnlyFile` level INFO | ruff чист; `python -c "from main import main_app; print(len(main_app.routes))"` → 41; curl `/docs`, `/users/get_all_users`, `/api/v1/dep_examples/single-direct-dependency` (header `foobar`), `/orders/get_all_orders?params=id` → 200 | ~12 |

### Фаза 1: Рефакторинг ConfigLogger и YAML

- **Файлы:**
  - `fastapi-application/config_log.py`
  - `fastapi-application/logging_config.yaml`
- **Контракт:**
  - Имена логгеров в YAML: `OnlyFile`, `Stdout`, `FileStdout`.
  - Экспорты модуля: `logF = <инстанс>.get_logger("OnlyFile")`, `logFC = <инстанс>.get_logger("FileStdout")`.
  - Имена констант по умолчанию: `DEFAULT_LOG_DIR = "./log"`, `DEFAULT_LOG_FILE = "example.log"`.
  - Имя файла лога при импорте модуля: `one_fast.log` в `BASE_DIR / DEFAULT_LOG_DIR`.
  - `root` в YAML: `level: WARNING`, `handlers: []`.
  - У логгеров `Stdout`, `FileStdout`, `OnlyFile` в YAML: `level: INFO`.
  - Хендлеры `rotating_file1` и `console1` остаются `level: INFO`.
- **Шаги:**
  1. В `config_log.py` заменить статические методы на методы инстанса, убрать `isSetting`, ленивую ветку, мёртвые атрибуты класса.
  2. Вынести дефолты в константы модуля.
  3. В `__init__` создать каталог и вызвать `_load_logging_config` + `dictConfig`.
  4. Удалить `logging.basicConfig(...)`.
  5. В `logging_config.yaml` добавить секцию `root` и сменить уровни у трёх логгеров на `INFO`.
  6. Создать инстанс на уровне модуля и проинициализировать `logF`/`logFC`.
  7. Проверить ruff и импорт приложения.
- **Checkpoint:**
  - `cd fastapi-application && uv run ruff check .` — без ошибок.
  - `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` — вывод `41`.
  - `cd fastapi-application && ../.venv/bin/python -c "from config_log import logF; logF.info('TEST_MARKER_CONFIG_LOG')"` — завершается без исключений и без вывода в stdout (OnlyFile не имеет консольного хендлера).
- **Готовность фазы:** оба файла отредактированы, checkpoint пройден, регресс соседних эндпоинтов не сломан.

## Критерии успеха

Проверяются qa по завершении фазы; сырые выводы — в `tasks/current/e2e/`.

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Линтер | `cd fastapi-application && uv run ruff check .` | Нет ошибок и предупреждений (допустимы игнорируемые проектом F401/E402/F541). |
| 2 | Счётчик маршрутов | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` | `41`. |
| 3 | Swagger UI | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/docs` | `200`. |
| 4 | Users endpoint | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/users/get_all_users` | `200`. |
| 5 | Depends example | `curl -s -o /dev/null -w "%{http_code}" -H "foobar: 5" http://127.0.0.1:8000/api/v1/dep_examples/single-direct-dependency` | `200`. |
| 6 | Orders endpoint | `curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:8000/orders/get_all_orders?params=id"` | `200`. |
| 7 | Root logger конфигурация | `cd fastapi-application && ../.venv/bin/python -c "import logging; from config_log import logF; r = logging.getLogger(); print(r.level, r.handlers)"` | `30 []` (WARNING=30, пустой список хендлеров). |
| 8 | Уровни именованных логгеров | `cd fastapi-application && ../.venv/bin/python -c "import logging; from config_log import logF; print(logging.getLogger('OnlyFile').level, logging.getLogger('Stdout').level, logging.getLogger('FileStdout').level)"` | `20 20 20` (INFO=20). |
| 9 | Хендлеры INFO | `cd fastapi-application && ../.venv/bin/python -c "import logging; from config_log import logF; h = logging.getLogger('OnlyFile').handlers; print([x.level for x in h])"` | `[20]` (хотя бы один хендлер, level INFO). |
| 10 | Запись в лог-файл | `cd fastapi-application && ../.venv/bin/python -c "from config_log import logF; logF.info('TEST_MARKER_CONFIG_LOG')" && grep -c "TEST_MARKER_CONFIG_LOG" log/one_fast.log` | `>= 1`. |

## Финальные критерии

1. Каждый критерий успеха подтверждён доказательством (e2e/, DEFECTS.md, ADVERSARIAL_REVIEW.md).
2. `tasks/current/DEFECTS.md` существует только если найдены дефекты; все записи не OPEN.
3. Adversarial-прогон выполнен, ни одна запись ADVERSARIAL_REVIEW.md не PENDING.

## Открытые вопросы

Нет.
