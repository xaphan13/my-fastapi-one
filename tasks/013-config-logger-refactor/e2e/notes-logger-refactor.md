# QA-прогон: рефакторинг ConfigLogger (фаза 1)

Задание: tasks/current/REQUIREMENTS.md
Дата: 2026-09-03
Агент: qa
Сервер: поднят вручную из `fastapi-application/`, PID 439541, порт 8000.
После прогона сервер погашен (см. конец файла).

## Сводка

| # | Критерий | Ожидание | Факт | Вердикт |
|---|---|---|---|---|
| 1 | Линтер (ruff) | нет ошибок | `All checks passed!` (ruff 0.14.10) | PASS |
| 2 | Счётчик маршрутов | 41 | 41 | PASS |
| 3 | /docs | 200 | 200 | PASS |
| 4 | /users/get_all_users | 200 | 200 | PASS |
| 5 | /api/v1/dep_examples/single-direct-dependency (header `foobar: 5`) | 200 | 200 | PASS |
| 6 | /orders/get_all_orders?params=id | 200 | 200 | PASS |
| 7 | Root logger (level, handlers) | `30 []` | `30 []` | PASS |
| 8 | Уровни OnlyFile/Stdout/FileStdout | `20 20 20` | `20 20 20` | PASS |
| 9 | Уровни хендлеров OnlyFile | `[20]` | `[20]` | PASS |
| 10 | Запись маркера в log/one_fast.log | `>= 1` | `1` | PASS |

Дефекты: не найдены — DEFECTS.md не создаётся.

## Подготовительный precheck

```bash
$ pgrep -af "uvicorn.*main:main_app"
(пусто)
$ curl -m 3 -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/openapi.json
000
```

Сервер не поднят — поднимаем свой.

## Check 1: ruff

Команда из REQUIREMENTS: `cd fastapi-application && uv run ruff check .`
(замечание: в системе `uv` живёт в `/home/max/.local/bin/uv`, а внутри
`fastapi-application/.venv/bin/uv` нет — это означает, что буквальная команда
`../.venv/bin/uv run ruff check .` падает с `Нет такого файла или каталога`.
Прогон сделан двумя валидными способами, оба PASS.)

```bash
$ uv run --directory fastapi-application ruff check .
All checks passed!
EXIT_UVRUFF=0

$ cd fastapi-application && ../.venv/bin/python -m ruff check .
All checks passed!
EXIT_PYRUFF=0

ruff --version
ruff 0.14.10
```

## Check 2: route count

```bash
$ cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"
41
```

## Check 3-6: HTTP-проверки на поднятом сервере

```bash
# Подъём
$ nohup /home/max/.../.venv/bin/uvicorn main:main_app --host 127.0.0.1 --port 8000 \
    >/tmp/qa-uvicorn.log 2>&1 &
PID=439541
# poll openapi.json
ready after 3s, code=200

# tail лога uvicorn
INFO:     Started server process [439541]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     127.0.0.1:57896 - "GET /openapi.json HTTP/1.1" 200 OK

$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/docs
200

$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/users/get_all_users
200

$ curl -s -o /dev/null -w "%{http_code}\n" -H "foobar: 5" \
    http://127.0.0.1:8000/api/v1/dep_examples/single-direct-dependency
200

$ curl -s -o /dev/null -w "%{http_code}\n" \
    "http://127.0.0.1:8000/orders/get_all_orders?params=id"
200
```

Бонусом — тела (sanity):

```text
GET /api/v1/dep_examples/single-direct-dependency   (header foobar: 5)
{"foobar":"5","message":"single direct dependency foobar"}

GET /orders/get_all_orders?params=id
[]

GET /users/get_all_users
[{"nickname":"string","firstname":"string","surname":"string","password":"string","id":1}]
```

## Check 7: Root logger

```bash
$ cd fastapi-application && ../.venv/bin/python -c \
  "import logging; from config_log import logF; \
   r = logging.getLogger(); print(r.level, r.handlers)"
30 []
```

`30` = WARNING, handlers — пустой список. Соответствует ожиданию `30 []`.

## Check 8: Уровни именованных логгеров

```bash
$ cd fastapi-application && ../.venv/bin/python -c \
  "import logging; from config_log import logF; \
   print(logging.getLogger('OnlyFile').level, \
         logging.getLogger('Stdout').level, \
         logging.getLogger('FileStdout').level)"
20 20 20
```

Все три — INFO (20).

## Check 9: Хендлеры OnlyFile

```bash
$ cd fastapi-application && ../.venv/bin/python -c \
  "import logging; from config_log import logF; \
   h = logging.getLogger('OnlyFile').handlers; print([x.level for x in h])"
[20]
```

Один хендлер, уровень INFO. Соответствует ожиданию `[20]`.

## Check 10: Запись в лог-файл

```bash
$ MARKER="TEST_MARKER_QA_RUN_439219_1788468795"
$ cd fastapi-application && ../.venv/bin/python -c \
  "from config_log import logF; logF.info('TEST_MARKER_QA_RUN_439219_1788468795')"
(пусто — OnlyFile без консольного хендлера, что и ожидается)

$ grep -c "TEST_MARKER_QA_RUN_439219_1788468795" log/one_fast.log
1
```

Свежий уникальный маркер `TEST_MARKER_QA_RUN_439219_1788468795` (PID+timestamp)
встречается 1 раз. Ожидание `>= 1` — PASS.

Доп. контроль: явное присутствие маркера в файле (не только счётчик):

```bash
$ grep "TEST_MARKER_QA_RUN_439219_1788468795" fastapi-application/log/one_fast.log
2026-09-03 ... INFO ... TEST_MARKER_QA_RUN_439219_1788468795
```

## Побочные наблюдения

- `import config_log` не печатает ничего в stdout (только создаёт каталог и
  применяет dictConfig, без `print`). Подтверждено: `python -c "import config_log"`
  → пусто.
- `logF.info(...)` от OnlyFile не печатает в stdout (только в файл) — подтверждено
  в Check 10.
- Сервер поднят в фоне, uvicorn-лог без traceback/ошибок, Application startup
  complete.

## Завершение

```bash
$ pkill -f "uvicorn.*main:main_app" ; sleep 1
$ pgrep -af "uvicorn.*main:main_app"
(пусто)
$ curl -m 3 -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/openapi.json
000
```

Сервер погашен, порт 8000 свободен.
