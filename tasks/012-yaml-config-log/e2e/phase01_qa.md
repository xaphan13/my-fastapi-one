
## QA phase01 run 2026-09-03T20:42:03+03:00
Server: PID 333724 uvicorn main:main_app (поднят не qa, openapi=200 перед прогоном)
### 1) uv run ruff check .
All checks passed!
ruff_exit=0
### 2) routes count (expect 41 baseline)
41
routes_exit=0
### 3) curl batch
/docs -> 200
/users/get_all_users -> 200
/orders/get_all_orders -> 422
/api/v1/dep_examples/single-direct-dependency -> 422
### 4) yaml version (expect 1)
1
### 5) public API (expect OnlyFile + marker in log)
OnlyFile
--- grep marker in one_fast.log:
1424:INFO: qa_check_phase01_final
### 6) regression: log file + fresh startup records
-rw-rw-r-- 1 max max 130722 сен  3 20:42 /home/max/0_0_26_new_one/my-fastapi-one/fastapi-application/log/one_fast.log

### Доп. проверка 422: параметры роутов из openapi.json
bash: строка 1: ../.venv/bin/python: Нет такого файла или каталога
--- curl с параметрами:
orders?order_by=name -> 422
dep?param_id=5 -> 422
### Доп. проверка 422 (повтор): параметры роутов из openapi.json
/api/v1/dep_examples/single-direct-dependency -> []
/orders/get_all_orders -> []
### Тела 422-ответов (без параметров и с параметрами)
{"detail":[{"type":"missing","loc":["query","params"],"msg":"Field required","input":null}]}
{"detail":[{"type":"missing","loc":["query","params"],"msg":"Field required","input":null}]}
{"detail":[{"type":"missing","loc":["header","foobar"],"msg":"Field required","input":null}]}
{"detail":[{"type":"missing","loc":["header","foobar"],"msg":"Field required","input":null}]}
### Хвост one_fast.log после запросов (последние 12 строк)
/* 2026-09-03 20:20:27,410 - create_fastapi.lifespan(16) - [MainThread] - [126287896065856] */  
INFO: startup lifespan :
settings.db.url=SqliteDsn('sqlite+aiosqlite:///one_simple.db') 
app.title='Example Request Parameters Extraction'
/* 2026-09-03 20:20:27,410 - create_fastapi.lifespan(18) - [MainThread] - [126287896065856] */  
WARNING: used test sqlite dataBase : settings.db.url=SqliteDsn('sqlite+aiosqlite:///one_simple.db')
/* 2026-09-03 20:20:57,726 - <string>.<module>(1) - [MainThread] - [128227697223488] */  
INFO: test phase01
/* 2026-09-03 20:42:04,204 - __init__.register_md_articles(37) - [MainThread] - [128956394850112] */  
INFO: register_md_articles: подключение middleware, static, router_blog_api
/* 2026-09-03 20:42:04,611 - <string>.<module>(1) - [MainThread] - [140085854385984] */  
INFO: qa_check_phase01_final
### Подтверждение 200 с корректными параметрами
dep?header_foobar -> 200
orders?params= -> 422
orders?params=order_by=name -> 422
orders?params=limit=5 -> 422
orders?params=id=1 -> 422
### orders с enum-параметром params=id|time|promocode
orders?params=id -> 200
orders?params=time -> 200
orders?params=promocode -> 200

## Итог QA phase01 (2026-09-03)
1) ruff check: PASS (All checks passed!)
2) routes=41: PASS (baseline из phase01_progress.md; историческое 40 — pre-existing discrepancy, не дефект фазы)
3) curl: /docs=200, /users/get_all_users=200 PASS; /orders/get_all_orders и /api/v1/dep_examples/single-direct-dependency без параметров = 422 — штатная валидация FastAPI (обязательный query 'params' enum id|time|promocode; обязательный header 'foobar'). С параметрами: params=id|time|promocode -> 200, header foobar=5 -> 200. НЕ дефект фазы логирования.
4) yaml version=1: PASS
5) публичный API: logF/logFC/ConfigLogger импортируются, get_logger('OnlyFile').name=OnlyFile, маркер qa_check_phase01_final в log/one_fast.log: PASS
6) регресс: в one_fast.log свежие записи startup lifespan (startup lifespan, settings.db.url=sqlite, register_md_articles): PASS
ВЕРДИКТ: все критерии фазы подтверждены. Дефектов не найдено, DEFECTS.md не создавался.
