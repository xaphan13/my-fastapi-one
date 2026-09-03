# Phase 01 progress — Вынести dictConfig логирования в YAML

## Что сделано
- fastapi-application/logging_config.yaml — создан одним write_file: словарь 1:1 (formatters form1-form4/con1/con2, handlers rotating_file1+console1, loggers Stdout/FileStdout/OnlyFile), filename "one_fast.log" как заглушка (подставляется в коде), uvicorn-секции сохранены комментариями, UTF-8.
- fastapi-application/config_log.py — три точечных edit: добавлен `import yaml`; удалена `create_config_dict`; добавлена `_load_logging_config(log_dir, log_file) -> dict` (yaml.safe_load от BASE_DIR/"logging_config.yaml" c encoding="utf-8", точечная подстановка cfg["handlers"]["rotating_file1"]["filename"] = str(path_dir / log_file)); в `__settings_logger` вызов заменён. Публичный API, basicConfig-пустышка, модульная инициализация и экспорты logF/logFC сохранены.

## Что осталось
- Ничего. Фаза готова к ревью.

## Checkpoint
- ruff (`uv run ruff check .`): All checks passed
- routes: 41 (см. примечание ниже)
- curl /docs → 200
- curl /users/get_all_users → 200
- tail log/one_fast.log: свежие записи (startup lifespan + "test phase01")
- yaml.safe_load(... )["version"] → 1
- from config_log import logF, logFC, ConfigLogger; get_logger("OnlyFile").name → OnlyFile, "test phase01" в логе

## Примечание оркестратору: routes 41 vs 40
- Спека ожидает 40, фактически 41. Доказано stash-проверкой: на базовом коде (правки config_log.py спрятаны, yaml убран) счётчик тоже 41 — расхождение существовало до фазы и не связано с ней. В дампе (phase01_routes_dump.txt) лишний роут — второй `APIRoute /api/blog/account` (блог-роуты после задачи 011; в AGENTS.md указано 12 JSON-роутов блога, фактически регистрируется 13).
- Остальные checkpoint-пункты зелёные без оговорок.

## Сырые выводы
- phase01_routes_dump.txt — полный дамп main_app.routes
- phase01_uvicorn.log — вывод uvicorn при smoke-прогоне
