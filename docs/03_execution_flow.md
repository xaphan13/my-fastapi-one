# 03 — Логика и работа кода

> Документ описывает жизненный цикл приложения, ключевые бизнес-процессы,
> роутинг, middleware, обработку ошибок и логирование.

---

## 1. Жизненный цикл приложения

### 1.1. Инициализация (при импорте модулей)

Порядок выполнения при запуске `main.py`:

```
1. base_dir_path.py
   → DIR_CWD = Path.cwd()
   → BASE_DIR = Path(__file__).resolve().parent  (fastapi-application/)

2. config_log.py (импортируется из main.py)
   → ConfigLogger.setting_path_logger(log_file="one_fast.log")
     → __create_log_dir("./log")           # создаёт директорию логов
     → __settings_logger()                 → dictConfig(logging_config)
   → logF = get_logger("OnlyFile")         # файловый логгер
   → logFC = get_logger("FileStdout")      # файловый + консольный логгер

3. core/config.py (импортируется из main.py)
   → settings = Settings()                 # чтение .env, валидация pydantic-settings
   → создаётся синглтон конфигурации

4. db_core/db_async.py (импортируется через create_fastapi.py)
   → db_manager = AsyncDbManager(url=..., ...)
     → create_async_engine(url, pool_size=50, max_overflow=10)
     → async_sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
     → если SQLite: регистрируется event-listener PRAGMA foreign_keys=ON
   → CurrentSession = Annotated[AsyncSession, Depends(db_manager.get_async_session)]

5. create_fastapi.py
   → main_app = create_app(custom_docs_url=False)
     → FastAPI(title=..., default_response_class=ORJSONResponse, lifespan=lifespan)
     → docs_url="/docs", redoc_url="/redoc"

6. main.py
   → main_app.include_router(router_api)      # /api/v1/...
   → main_app.include_router(r_users_sql)     # /users/...
   → main_app.include_router(r_order_one)     # /orders/...
```

### 1.2. Запуск (Startup)

**Dev-режим** (`main.py`):
```python
uvicorn.run("main:main_app", host=settings.run.host, port=settings.run.port, reload=True)
```
- `reload=True` — автоперезагрузка при изменении файлов.
- Запускается один воркер.

**Prod-режим** (`main_gunicorn.py`):
```python
MyGunicornApp(application=main_app, options=get_app_options(...)).run()
```
- `gunicorn` управляет процессами; `worker_class = "uvicorn.workers.UvicornWorker"`.
- `workers = settings.gunicorn.workers` (по умолчанию 1).
- `timeout = settings.gunicorn.timeout` (по умолчанию 900 сек).

**Lifespan-хук** (`create_fastapi.py → lifespan`):
```python
async def lifespan(app: FastAPI):
    logF.info(f"startup lifespan: {settings.db.url=} {app.title=}")
    if isinstance(settings.db.url, SqliteDsn):
        logF.warning(f"used test sqlite dataBase: {settings.db.url=}")
    yield
    # shutdown:
    await db_manager.engine_dispose()   # освобождение пула соединений
```

### 1.3. Завершение работы (Shutdown)

При получении сигнала остановки (SIGTERM/SIGINT):
1. Gunicorn/uvicorn завершает активные запросы (с учётом `timeout`).
2. Срабатывает `lifespan` shutdown-часть → `db_manager.engine_dispose()`.
3. `AsyncEngine.dispose()` закрывает все соединения в пуле.
4. Процесс завершается.

---

## 2. Ключевые бизнес-процессы

### 2.1. Процесс 1: Создание пользователя

**Точка входа:** `POST /users/create_user`
**Роутер:** `fastapi-application/example_sql/router_users.py` → `create_user()`
**CRUD:** `fastapi-application/example_sql/crud/crud_users.py` → `create_user()`

```
Шаг 1. Клиент отправляет POST с JSON-телом:
       {"nickname": "alice", "firstname": "Alice", "surname": "Smith", "password": "secret"}

Шаг 2. FastAPI резолвит зависимости:
       - session: CurrentSession → db_manager.get_async_session() → новая AsyncSession
       - user_create: UserCreate → Body() → pydantic-валидация JSON-тела

Шаг 3. Вызов CRUD-функции:
       user = User(**user_create.model_dump())
       session.add(user)              # объект добавлен в сессию (не в БД)
       await session.commit()         # INSERT INTO users (...) VALUES (...)
       await session.refresh(user)    # SELECT — получение сгенерированного id

Шаг 4. Response:
       response_model=UserResp → pydantic создаёт модель из ORM-объекта (from_attributes=True)
       → ORJSONResponse → orjson.dumps() → JSON клиенту
       {"id": 1, "nickname": "alice", "firstname": "Alice", "surname": "Smith", "password": "secret"}
```

### 2.2. Процесс 2: Получение всех пользователей

**Точка входа:** `GET /users/get_all_users`
**Роутер:** `router_users.py` → `get_users()`
**CRUD:** `crud_users.py` → `get_all_users()`

```
Шаг 1. FastAPI резолвит session: CurrentSession
Шаг 2. stmt = select(User).order_by(User.id)
Шаг 3. result = await session.scalars(stmt)   # выполняет SELECT
Шаг 4. return result.all()                     # Sequence[User]
Шаг 5. response_model=list[UserResp] → сериализация списка
```

### 2.3. Процесс 3: Создание заказа

**Точка входа:** `POST /orders/add_order`
**Роутер:** `fastapi-application/ex_order_product/router_order_one.py` → `add_order()`

```
Шаг 1. Клиент отправляет: {"promocode": "SAVE10"}
Шаг 2. body: OrderCreateBody → pydantic-валидация
Шаг 3. new_order = Order(**body.model_dump())
       db.add(new_order)
       await db.commit()        # INSERT INTO orders (promocode) VALUES ('SAVE10')
       await db.refresh(new_order)  # получение id, created_at
Шаг 4. response_model=OrderResp → {"id": 1, "created_at": "...", "promocode": "SAVE10"}
```

### 2.4. Процесс 4: Получение заказов с joinedload

**Точка входа:** `GET /orders/get_all_join?variant=1`
**Роутер:** `router_order_one.py` → `get_all_join()`

```
Шаг 1. stmt = select(Order).order_by(Order.id).options(joinedload(Order.products))
Шаг 2. result = await db.execute(stmt)
       → SQL: SELECT orders.*, products.*, assoc.*
              FROM orders
              LEFT OUTER JOIN order_product_association AS assoc ON orders.id = assoc.order_id
              LEFT OUTER JOIN products ON assoc.product_id = products.id
              ORDER BY orders.id
Шаг 3. variant == 1:
       result_scalars_all = result.unique().scalars().all()
       → unique() необходим, т.к. joinedload возвращает дубликаты строк для one-to-many
       → scalars() извлекает ORM-объекты из Row
       → all() собирает список
Шаг 4. Логирование order0, order1 и их products (для отладки)
Шаг 5. response_model=list[OrderRespWithProducts]
       → сериализация с вложенными products: List[ProductResp]
```

### 2.5. Процесс 5: Фильтрация заказов

**Точка входа 1:** `GET /orders/get_order_filter_by?id=1&promocode=SAVE10`
— использует `filter_by(**dict)` — фильтр по точному совпадению.
— возвращает одну запись (`OrderResp`) или `HTTP 409` если не найдено.

**Точка входа 2:** `GET /orders/get_order_where?id=1`
— использует `where(*[getattr(Order, key) == value])` — фильтр через SQL-выражения.
— возвращает список (`OrderResp | list[OrderResp]`) или `HTTP 409` если не найдено.

### 2.6. Процесс 6: Извлечение параметров запроса (демонстрационный)

**Точка входа:** `GET /api/v1/{approach}/my_items/{item_id}?param_id=123`
**Где `{approach}`** — один из четырёх префиксов:

| Префикс | Роутер | Подход |
|---|---|---|
| `/fastapi_class_old` | `my_param_fast_cls.py` | `Path(...)`, `Query(...)`, `Header(...)`, `Cookie(...)` как дефолтные значения |
| `/fastapi_class_annotated` | `my_param_fast_ann.py` | `Annotated[int, Path(...)]` — современный стиль |
| `/depends_class_annotated` | `my_param_dep_cls.py` | `Depends(PathData)` — классы-зависимости |
| `/depends_function_annotated` | `my_param_dep_func.py` | `Depends(get_item_id)` — функции-зависимости |

Все четыре подхода функционально эквивалентны — извлекают одни и те же данные
(path, query, header, cookie, request, response) и возвращают одинаковый JSON-ответ.
Разница — в стиле кода и переиспользуемости логики валидации.

---

## 3. Роутинг и Middleware

### 3.1. Регистрация роутеров

Роутеры регистрируются в `main.py` через `main_app.include_router()`:

```python
main_app.include_router(router_api)       # /api/v1/...  (демонстрационные роуты)
main_app.include_router(r_users_sql)      # /users/...   (CRUD users)
main_app.include_router(r_order_one)      # /orders/...  (CRUD orders + join)
```

Вложенная структура:
- `router_api` (`/api`) → `router_api_v1` (`/v1`) → `router_dep_examples` (`/dep_examples`) + `router_param_extract`
- `router_param_extract` → 4 подроутера с разными prefix из `settings.api.v1`

### 3.2. Middleware

**Явно настроенные middleware отсутствуют.** Используются только встроенные middleware FastAPI/Starlette:
- `ExceptionMiddleware` — перехват `HTTPException`
- `ServerErrorMiddleware` — перехват непредвиденных исключений (500)
- CORS middleware **не настроен** (см. раздел "Безопасность" в `04_code_quality.md`)

### 3.3. Обработка входящих соединений

```
TCP-соединение → uvicorn (ASGI-протокол)
  → Starlette Request-объект
    → FastAPI routing (сопоставление path + method)
      → Dependency resolution (рекурсивный граф Depends)
        → Handler-функция
          → Response (ORJSONResponse / JSONResponse / HTTPException)
```

---

## 4. Механизмы обработки ошибок

### 4.1. HTTP-ошибки (бизнес-логика)

Используется `HTTPException` из `fastapi`:

| Роутер | Условие | Status Code |
|---|---|---|
| `get_order_filter_by` | Заказ не найден | `409 CONFLICT` |
| `get_order_where` | Заказы не найдены | `409 CONFLICT` |
| `HeaderAccessDependency.validate` | Невалидный токен | `401 UNAUTHORIZED` |

> **Замечание:** использование `409 CONFLICT` для "not found" семантически некорректно —
> следует использовать `404 NOT FOUND`. См. `04_code_quality.md`.

### 4.2. Ошибки валидации (автоматические)

FastAPI автоматически возвращает `422 Unprocessable Entity` с деталями ошибки,
если входные данные не проходят pydantic-валидацию (тип, диапазон, обязательность).

### 4.3. Ошибки базы данных

В `AsyncDbManager.get_async_session()`:
```python
async with self.session_factory() as session:
    try:
        yield session
    except Exception:
        await session.rollback()   # откат транзакции при любой ошибке
        raise                      # проброс исключения выше
```

При ошибке БД (например, `IntegrityError` — нарушение уникальности):
1. Выполняется `session.rollback()`.
2. Исключение пробрасывается в FastAPI.
3. FastAPI возвращает `500 Internal Server Error` (если нет кастомного handler-а).

> **Глобальный exception handler для БД-ошибок отсутствует.** Пользователь получает
> неинформативный 500 без деталей. См. рекомендации в `05_optimization_roadmap.md`.

### 4.4. Непредвиденные исключения

Перехватываются `ServerErrorMiddleware` Starlette → `500 Internal Server Error`.
В dev-режиме возвращается traceback; в prod — только сообщение.

---

## 5. Логирование

### 5.1. Конфигурация

Файл: `fastapi-application/config_log.py`

Используется стандартный модуль `logging` с `dictConfig`.

**Хендлеры:**

| Handler | Класс | Уровень | Формат | Назначение |
|---|---|---|---|---|
| `rotating_file1` | `RotatingFileHandler` | `INFO` | `form2` | Запись в файл `./log/one_fast.log`, ротация 1 MB × 20 файлов |
| `console1` | `StreamHandler` (stdout) | `INFO` | `con2` | Вывод в консоль |

**Логгеры:**

| Логгер | Хендлеры | Уровень | Использование |
|---|---|---|---|
| `OnlyFile` | `rotating_file1` | `DEBUG` | `logF` — только файл (основной логгер в приложении) |
| `FileStdout` | `rotating_file1` + `console1` | `DEBUG` | `logFC` — файл + консоль (объявлен, но почти не используется) |
| `Stdout` | `console1` | `DEBUG` | Только консоль (объявлен, не используется) |

### 5.2. Точки логирования в коде

| Файл | Сообщение | Уровень |
|---|---|---|
| `main.py` → `main()` | Базовые пути `DIR_CWD`, `BASE_DIR` | `info` |
| `main.py` → `main()` | Завершение работы | `warning` |
| `create_fastapi.py` → `lifespan` | DB URL, app.title при старте | `info` / `warning` |
| `router_order_one.py` | Тип и значение `order_by_list_o` | `info` |
| `router_order_one.py` | `order0`, `order1`, `prods0`, `prods1` при join | `info` |
| `my_param_*.py` (4 файла) | Извлечённые параметры запроса | `info` |

### 5.3. Логирование gunicorn

Файл: `fastapi-application/core/gunicorn/gunicorn_log.py`

`GunicornLogger(Logger)` переопределяет `setup()` — устанавливает кастомный формат
(`settings.logging_gunicorn.log_format`) для access-log и error-log.
Логи gunicorn выводятся в stdout (`accesslog: "-"`, `errorlog: "-"`).

### 5.4. Логирование uvicorn

Интеграция uvicorn-логов с кастомной конфигурацией **закомментирована** в `config_log.py`
(блок `"uvicorn"`, `"uvicorn.error"`, `"uvicorn.access"`). Uvicorn использует собственные
логгеры, независимые от `ConfigLogger`.

### 5.5. Логирование Alembic

Конфигурация в `alembic.ini`:
- `logger_alembic` → `INFO`
- `logger_sqlalchemy` → `WARN`
- `logger_root` → `WARN`
- Вывод в `sys.stderr` через `StreamHandler`.
