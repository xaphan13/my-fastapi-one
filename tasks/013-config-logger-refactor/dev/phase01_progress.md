# Фаза 1 — Рефакторинг ConfigLogger и YAML

Дата: 2026-09-03
Исполнитель: backend-dev
Задание: «Рефакторинг ConfigLogger и выравнивание уровней логирования»

## План

1. `fastapi-application/logging_config.yaml` — добавить секцию `root`, поменять уровни трёх логгеров на INFO.
2. `fastapi-application/config_log.py` — превратить ConfigLogger в инстанс-класс с `__init__(log_dir, log_file)`, вынести дефолты в константы модуля, удалить `logging.basicConfig`, оставить `_load_logging_config`, экспортировать `logF`/`logFC`, создать инстанс на уровне модуля.
3. Проверки: ruff, импорт main_app (ожидание 41), импорт logF с TEST_MARKER без stdout.

## Прогресс

- 2026-09-03 — logging_config.yaml: добавлена секция `root: {level: WARNING, handlers: []}`; логгеры Stdout/FileStdout/OnlyFile переведены с DEBUG на INFO. Хендлеры rotating_file1/console1 не тронуты (уже INFO).
- 2026-09-03 — config_log.py: переписан под инстанс-класс. Добавлены константы модуля `DEFAULT_LOG_DIR = "./log"`, `DEFAULT_LOG_FILE = "example.log"`. `ConfigLogger` теперь имеет `__init__(self, log_dir, log_file)` — создаёт каталог, вызывает `_load_logging_config`, применяет `dictConfig`. Приватные методы `_create_log_dir` (статический) и `_settings_logger`. Инстанс-метод `get_logger(self, nameBase)` с сохранённым docstring про OnlyFile/Stdout/FileStdout. Удалены: статические методы, флаг `isSetting`, ленивая ветка в `get_logger`, мёртвые атрибуты `pathDir_default`/`nameFile_default`, `logging.basicConfig(...)`. `_load_logging_config` оставлен без изменений. На уровне модуля создаётся `config_logger = ConfigLogger(log_dir=DEFAULT_LOG_DIR, log_file="one_fast.log")`, затем `logF = config_logger.get_logger("OnlyFile")`, `logFC = config_logger.get_logger("FileStdout")`.

## Checkpoint (2026-09-03)

- `ruff check config_log.py` → All checks passed!
- `python -c "from main import main_app; print(len(main_app.routes))"` → 41
- `python -c "from config_log import logF; logF.info('TEST_MARKER_CONFIG_LOG')"` → без исключений, без вывода в stdout
- root logger: `30 []` (WARNING=30, handlers пустые) — критерий 7 PASS
- именованные логгеры OnlyFile/Stdout/FileStdout: `20 20 20` (INFO=20) — критерий 8 PASS
- хендлеры OnlyFile: `[20]` — критерий 9 PASS
- `grep -c TEST_MARKER_CONFIG_LOG log/one_fast.log` → 1 — критерий 10 PASS

Фаза готова. Сервер не поднимался.