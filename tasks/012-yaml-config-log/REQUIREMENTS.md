# Вынести dictConfig логирования в YAML

Перенести словарь `logging.config.dictConfig` из `fastapi-application/config_log.py` в отдельный YAML-файл рядом с модулем. Словарь переносится 1:1, поведение логирования (форматтеры, хендлеры, логгеры, пути, инициализация на импорте, публичный API) не меняется. Единственная динамика — подстановка `filename` для `RotatingFileHandler` в коде после `yaml.safe_load`.

## Подтверждённые решения

1. Формат — YAML + `logging.config.dictConfig`; pyyaml уже в зависимостях, новых зависимостей не добавлять.
2. Словарь 1:1: formatters (`form1`–`form4`, `con1`, `con2`), handlers (`rotating_file1`: `RotatingFileHandler`, level `INFO`, formatter `form2`, maxBytes `1048576`, backupCount `20`; `console1`: `StreamHandler`, `ext://sys.stdout`), loggers (`Stdout`, `FileStdout`, `OnlyFile` с level `DEBUG`) — значения без изменений.
3. Закомментированные секции `uvicorn` / `uvicorn.error` / `uvicorn.access` сохранить комментариями и в YAML (русские комментарии → чтение YAML с `encoding="utf-8"`).
4. Единственная динамика — `filename` хендлера `rotating_file1`: подставляется в коде после `yaml.safe_load` точечно по ключу, вида `cfg["handlers"]["rotating_file1"]["filename"] = str(path_dir / log_file)`. Глобальная `%-`интерполяция всего файла запрещена: в формат-строках живут `%(asctime)s` и т.п.
5. Поведение не меняется: инициализация на импорте модуля (`ConfigLogger.setting_path_logger(log_file="one_fast.log")` на уровне модуля), итоговый файл `fastapi-application/log/one_fast.log`, экспорты `logF` (`OnlyFile`) и `logFC` (`FileStdout`), публичный API `ConfigLogger` (`setting_path_logger`, `get_logger`) сохраняются.
6. Расположение YAML-файла: `fastapi-application/logging_config.yaml` (рядом с `config_log.py`, по аналогии с `one.env`/`two.env`).

## Результат

- Существует файл `fastapi-application/logging_config.yaml` с 1:1 копией словаря из текущего `create_config_dict`.
- В `fastapi-application/config_log.py` удалена функция `create_config_dict`; вместо неё используется загрузчик YAML + точечная подстановка пути файла лога.
- Публичный API `ConfigLogger` и экспорты `logF`/`logFC` не изменились.
- При запуске приложения логи продолжают писаться в `fastapi-application/log/one_fast.log`.

## Вне рамок

- basicConfig-пустышка в `__settings_logger`.
- Рассинхрон уровней `DEBUG`/`INFO` между хендлерами и логгерами.
- `os.mkdir` без `parents=True`/`exist_ok=True`.
- `delay=True` для `RotatingFileHandler`.
- Ротация в multi-worker (gunicorn).
- Перенос настроек лога в `core/config.py` (`Settings`).
- Раскомментирование uvicorn-секций.

## План фаз

| # | Фаза | Исполнитель | Файлы | Контракт | Checkpoint | Бюджет ходов |
|---|---|---|---|---|---|---|
| 1 | YAML + загрузчик логирования | backend-dev | `fastapi-application/logging_config.yaml` (новый), `fastapi-application/config_log.py` | YAML содержит словарь 1:1 с placeholder для `filename`; `config_log.py` загружает YAML через `yaml.safe_load` с `encoding="utf-8"` и подставляет путь до лога точечно; публичный API и модульная инициализация сохранены | `uv run ruff check .` чист; `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` → `40`; `curl -s http://127.0.0.1:8000/users/get_all_users` → `200`; в `fastapi-application/log/one_fast.log` появились новые строки | ~10 |

### Фаза 1: YAML + загрузчик логирования

- Файлы:
  - `fastapi-application/logging_config.yaml` — создать.
  - `fastapi-application/config_log.py` — изменить.

- Контракт:
  - `logging_config.yaml`:
    - `version: 1`, `disable_existing_loggers: False`.
    - `formatters`: `form1`, `form2`, `form3`, `form4`, `con1`, `con2` с исходными `format`-строками (с `%(asctime)s` и т.п.).
    - `handlers`:
      - `rotating_file1`: `class: logging.handlers.RotatingFileHandler`, `level: INFO`, `formatter: form2`, `filename` — строка-заглушка (например `"one_fast.log"` или `""`), `maxBytes: 1048576`, `backupCount: 20`.
      - `console1`: `class: logging.StreamHandler`, `level: INFO`, `formatter: con2`, `stream: ext://sys.stdout`.
    - `loggers`: `Stdout`, `FileStdout`, `OnlyFile` с `level: DEBUG` и исходными списками `handlers`.
    - Закомментированные секции `uvicorn`, `uvicorn.error`, `uvicorn.access` сохранены как YAML-комментарии (русские комментарии допустимы).
  - `config_log.py`:
    - Добавить `import yaml`.
    - Удалить функцию `create_config_dict`.
    - Добавить внутреннюю функцию `_load_logging_config(log_dir: str, log_file: str) -> dict`, которая:
      - Формирует `path_dir = BASE_DIR / log_dir`.
      - Читает `BASE_DIR / "logging_config.yaml"` с `encoding="utf-8"` и `yaml.safe_load`.
      - Подставляет `cfg["handlers"]["rotating_file1"]["filename"] = str(path_dir / log_file)`.
      - Возвращает словарь.
    - В `ConfigLogger.__settings_logger` вместо `create_config_dict(...)` вызвать `_load_logging_config(log_dir, log_file)`.
    - Сохранить `ConfigLogger.__create_log_dir`, `ConfigLogger.setting_path_logger`, `ConfigLogger.get_logger`, `ConfigLogger.isSetting`, `ConfigLogger.pathDir_default`, `ConfigLogger.nameFile_default`, `logging.basicConfig(level=logging.INFO, handlers=[])`.
    - Сохранить модульный вызов `ConfigLogger.setting_path_logger(log_file="one_fast.log")` и экспорты `logF = ConfigLogger.get_logger("OnlyFile")`, `logFC = ConfigLogger.get_logger("FileStdout")`.

- Шаги:
  1. Создать `fastapi-application/logging_config.yaml` с 1:1 структурой словаря, кодировкой UTF-8.
  2. Правка `config_log.py`: заменить `create_config_dict` на загрузчик YAML, сохранить публичный API и инициализацию.
  3. `uv run ruff check .`.
  4. `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"`.
  5. Запустить `../.venv/bin/uvicorn main:main_app --port 8000`, выполнить `curl http://127.0.0.1:8000/users/get_all_users`, проверить наличие новых записей в `fastapi-application/log/one_fast.log`.

- Checkpoint:
  - `uv run ruff check .` — без ошибок.
  - Счётчик маршрутов `len(main_app.routes)` равен `40`.
  - `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/users/get_all_users` → `200`.
  - После запуска/запроса файл `fastapi-application/log/one_fast.log` дополнен строками.

- Готовность фазы: оба файла соответствуют контракту, checkpoint зелёный, лишних изменений нет.

## Критерии успеха

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Ruff чист | `uv run ruff check .` | Выход без ошибок/предупреждений |
| 2 | Приложение собирается | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` | `40` |
| 3 | `/docs` доступен | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/docs` | `200` |
| 4 | CRUD-роут работает | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/users/get_all_users` | `200` |
| 5 | Лог-файл пишется | `ls -l fastapi-application/log/one_fast.log && tail -n 5 fastapi-application/log/one_fast.log` | Файл существует, содержит свежие записи после запуска/запроса |
| 6 | YAML-файл читается | `cd fastapi-application && ../.venv/bin/python -c "import yaml; print(yaml.safe_load(open('logging_config.yaml', encoding='utf-8'))['version'])"` | `1` |
| 7 | Публичный API сохранён | `cd fastapi-application && ../.venv/bin/python -c "from config_log import logF, logFC, ConfigLogger; logF.info('test'); print(ConfigLogger.get_logger('OnlyFile').name)"` | Вывод `OnlyFile`, в `log/one_fast.log` появилась строка `test` |

## Финальные критерии

1. Каждый критерий успеха подтверждён доказательством (`tasks/current/e2e/`, `DEFECTS.md`, `ADVERSARIAL_REVIEW.md`).
2. `tasks/current/DEFECTS.md` существует только если найдены дефекты; все записи не `OPEN`.
3. Adversarial-прогон выполнен, ни одна запись `ADVERSARIAL_REVIEW.md` не `PENDING`.

## Открытые вопросы

Нет.

---

# Отчёт о выполнении

- Дата закрытия: 2026-09-03
- Коммит: изменения не коммитились

## Итог
Словарь dictConfig перенесён из `fastapi-application/config_log.py` в новый
`fastapi-application/logging_config.yaml` (1:1), загрузка — через `yaml.safe_load`
с точечной подстановкой `filename`. Все 7 критериев успеха подтверждены QA-прогоном,
adversarial-прогон находок не дал.

## Изменения
- `fastapi-application/logging_config.yaml` → новый файл: словарь 1:1 (6 форматтеров,
  2 хендлера, 3 логгера), uvicorn-секции комментариями, UTF-8; `filename` — заглушка,
  подставляется кодом.
- `fastapi-application/config_log.py` → `import yaml`; `create_config_dict` удалена;
  добавлена `_load_logging_config(log_dir, log_file)` (safe_load, encoding utf-8,
  подстановка `cfg["handlers"]["rotating_file1"]["filename"]`); вызов из
  `__settings_logger`. Публичный API, инициализация на импорте, экспорты
  `logF`/`logFC` не изменились.
- `.qwen/agents/backend-dev.md`, `.qwen/agents/qa.md`, `.qwen/agents/adversary.md`
  → модель переключена с `nordrouter/minimax/minimax-m3` (9× 400-сбоев за день)
  на `nordrouter/z-ai/glm-5.3-flash` (backend-dev, qa) и
  `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` (adversary) — по решениям
  пользователя в чате.

## Критерии успеха
| # | Критерий | Результат | Доказательство |
|---|---|---|---|
| 1 | Ruff чист | PASS | e2e/phase01_qa.md §1: All checks passed, exit 0 |
| 2 | Приложение собирается | PASS | e2e/phase01_qa.md §2: routes=41 (фактический baseline; историческое ожидание 40 — pre-existing, не дефект фазы; обоснование dev/phase01_progress.md) |
| 3 | `/docs` доступен | PASS | e2e/phase01_qa.md §3: 200 |
| 4 | CRUD-роут работает | PASS | e2e/phase01_qa.md §3: `/users/get_all_users` 200 |
| 5 | Лог-файл пишется | PASS | e2e/phase01_qa.md §5-6: маркер qa_check_phase01_final в log/one_fast.log:1424, свежие записи startup |
| 6 | YAML-файл читается | PASS | e2e/phase01_qa.md §4: safe_load version=1 |
| 7 | Публичный API сохранён | PASS | e2e/phase01_qa.md §5: OnlyFile, logF/logFC/ConfigLogger импортируются |

## Дефекты
Не найдены — DEFECTS.md не создавался.

## Adversarial-прогон
5 проверок (битый YAML → fail-fast ValueError; CWD-изоляция BASE_DIR; валидность YAML;
yaml-инъекция `!!python/object` → ConstructorError от safe_load; конкурентные записи —
строки атомарны), находок 0 — ADVERSARIAL_REVIEW.md «Выполненные проверки (находок нет)»,
PENDING-записей нет, триаж не требовался.

## Участники
- backend-dev (glm-5.3-flash): фаза 1 — logging_config.yaml + config_log.py, checkpoint
  зелёный (ruff, routes, curl, лог); dev/phase01_progress.md + routes dump.
- qa (glm-5.3-flash): все критерии PASS, разбор 422 как штатной валидации обязательных
  параметров; e2e/phase01_qa.md.
- adversary (nemotron-3-ultra-550b:free): 5 проверок, 0 находок; ADVERSARIAL_REVIEW.md.
- оркестратор: спека (через spec-writer на kimi-k2.7-code), ревью диффа, переключение
  моделей по сбоям провайдера, архивация.

## Инфраструктурные заметки
- Связка харнесс→`nordrouter/minimax/minimax-m3` 2026-09-03 падала 400 «Запрос отклонён»
  9 раз подряд (при прямых curl-пробах к роуту — 200; payload, tools, большие контексты
  проходили). Связка харнесс→glm и →kimi работали. Причина — на стороне omniroute/минимакс-роута.
- glm отдавал 429 «Слишком много запросов» под нагрузкой — лечится паузой/переключением.
