# 02 — Архитектура и паттерны

> Документ описывает высокоуровневую архитектуру, паттерны проектирования,
> поток данных и управление состоянием в проекте `my-fastapi-one`.

---

## 1. Высокоуровневая архитектура

Проект представляет собой **монолитное модульное приложение** со **слоистой архитектурой**.
Все компоненты выполняются в одном процессе; горизонтального масштабирования нет.
Связь между слоями — через FastAPI Dependency Injection (синхронный граф зависимостей на каждый запрос).

```
┌─────────────────────────────────────────────────────────┐
│                    ТОЧКА ВХОДА                           │
│  main.py (uvicorn)  /  main_gunicorn.py (gunicorn)      │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────▼───────────────┐
         │    create_fastapi.py          │
         │    create_app() — фабрика     │
         │    lifespan, ORJSONResponse   │
         └───────────────┬───────────────┘
                         │
    ┌────────────────────▼────────────────────┐
    │              СЛОЙ API                    │
    │  api/__init__.py  (router_api → /api)    │
    │  ├── router_api_v1 → /api/v1             │
    │  │   ├── dependencies/ → /api/v1/dep_examples
    │  │   └── my_routes_dep/ → /api/v1/...    │
    │  ├── example_sql/    → /users            │
    │  └── ex_order_product/ → /orders         │
    └────────────────────┬────────────────────┘
                         │ Depends(CurrentSession)
    ┌────────────────────▼────────────────────┐
    │           СЛОЙ БАЗЫ ДАННЫХ               │
    │  db_core/db_async.py                     │
    │  AsyncDbManager → async_sessionmaker     │
    │  → AsyncEngine → PostgreSQL / SQLite     │
    └──────────────────────────────────────────┘
```

### Характеристики

| Характеристика | Значение |
|---|---|
| Тип архитектуры | Монолит, слоистая (layered) |
| Парадигма I/O | Полностью асинхронная (async/await) |
| Количество процессов | 1 (uvicorn) или N (gunicorn workers) |
| Состояние | Stateless (состояние только в БД; сессии создаются на запрос) |
| Связь между слоями | DI через `Annotated[T, Depends(...)]` |

---

## 2. Основные паттерны проектирования

### 2.1. Application Factory (Фабрика приложений)

Файл: `fastapi-application/create_fastapi.py`

`create_app(custom_docs_url: bool)` инкапсулирует создание экземпляра `FastAPI`:
настройка `lifespan`, `default_response_class=ORJSONResponse`, опциональная регистрация
кастомных docs-роутов через `reg_docs_routes(app)`. Это позволяет создавать несколько
конфигураций приложения (например, для тестов и prod) с разными параметрами.

### 2.2. Dependency Injection (Внедрение зависимостей)

Проект демонстрирует **четыре** способа DI в FastAPI:

| Способ | Файл | Механика |
|---|---|---|
| **Функция-зависимость** | `api/dependencies/func_deps.py`, `api/my_routes_dep/dep_func_schema.py` | `Depends(get_x_foo_bar)` — FastAPI вызывает функцию, результат инъецируется |
| **Класс-зависимость (через `__init__`)** | `api/my_routes_dep/dep_cls_schema.py` | `Depends(PathData)` — FastAPI вызывает `__init__`, параметры конструктора резолвятся из запроса |
| **Класс-зависимость (через `__call__`)** | `api/dependencies/cls_deps.py` → `HeaderAccessDependency` | `Depends(HeaderAccessDependency(secret_token="..."))` — экземпляр вызывается как callable |
| **Метод-зависимость (generator)** | `api/dependencies/cls_deps.py` → `PathReaderDependency.as_dependency` | `Depends(path_reader.as_dependency)` — генератор с `yield`, cleanup после запроса |

### 2.3. Session-per-Request (Сессия на запрос)

Файл: `fastapi-application/db_core/db_async.py`

`AsyncDbManager.get_async_session()` — асинхронный генератор, создающий сессию из
`async_sessionmaker` на каждый запрос. При исключении выполняется `session.rollback()`.
Сессия инъецируется через тип-алиас:

```python
CurrentSession = Annotated[AsyncSession, Depends(db_manager.get_async_session)]
```

Это позволяет любому роутеру получить сессию просто объявив параметр `session: CurrentSession`.

### 2.4. Repository / CRUD-функции

Файл: `fastapi-application/example_sql/crud/crud_users.py`

CRUD-операции вынесены в отдельные асинхронные функции (`get_all_users`, `create_user`),
принимающие `AsyncSession` как аргумент. Это упрощённый вариант паттерна Repository —
без классов, но с чётким разделением: роутер → CRUD-функция → ORM.

> **Примечание:** модуль `ex_order_product` **не следует** этому паттерну — SQL-запросы
> написаны прямо в роутере (`router_order_one.py`), что нарушает разделение слоёв.

### 2.5. Annotated Type Aliases (Переиспользуемые типы)

Файлы: `db_core/type_for_models.py`, `api/my_routes_dep/pydantic_validator.py`

Колонки ORM и поля Pydantic-моделей объявляются через `Annotated`-алиасы:
`int_primary_key`, `time_stamp_utc`, `str_len_50`, `PathID`, `QueryID`, `PortNumber`.
Это паттерн **Type Composition** — переиспользование метаданных валидации и mapping-а.

### 2.6. Mixin (для ORM-моделей)

Файл: `fastapi-application/example_sql/models/model_id_pk_mixin.py`

`IntIdPkMixin` предоставляет поле `id: Mapped[int]` с `primary_key=True`.
Используется в `TestUser(IntIdPkMixin, Base)` — демонстрация множественного наследования
для композиции ORM-моделей.

### 2.7. Adapter (адаптер gunicorn → ASGI)

Файл: `fastapi-application/core/gunicorn/gunicorn_app.py`

`MyGunicornApp(BaseApplication)` адаптирует FastAPI-приложение для запуска под gunicorn,
реализуя `load()` и `load_config()`.

### 2.8. Lifespan (управление жизненным циклом)

Файл: `fastapi-application/create_fastapi.py`

`@asynccontextmanager async def lifespan(app)` — выполняет startup-логику (логирование)
и shutdown-логику (`await db_manager.engine_dispose()` — освобождение пула соединений).

---

## 3. Схема потока данных (Data Flow)

### 3.1. Запрос на создание пользователя (`POST /users/create_user`)

```
Клиент
  │
  │  POST /users/create_user  Body: {"nickname":"alice","password":"secret",...}
  ▼
┌──────────────────────────────────────────────────────────┐
│  ASGI-сервер (uvicorn / gunicorn+UvicornWorker)           │
│  Десериализация HTTP → Request-объект Starlette           │
└──────────────────────────┬───────────────────────────────┘
                           │
  ┌────────────────────────▼──────────────────────────────┐
  │  FastAPI middleware chain (встроенные)                 │
  │  → сопоставление URL с зарегистрированным роутером     │
  └────────────────────────┬──────────────────────────────┘
                           │
  ┌────────────────────────▼──────────────────────────────┐
  │  router_order_one / router_users (APIRouter)           │
  │  fastapi-application/example_sql/router_users.py       │
  │  @r_users_sql.post("/create_user")                     │
  └────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────▼───────────────┐
           │  Dependency Resolution (DI)   │
           │  1. CurrentSession            │
           │     → db_manager              │
           │       .get_async_session()    │
           │     → async_sessionmaker()    │
           │     → AsyncSession            │
           │  2. Body() → UserCreate       │
           │     (pydantic-валидация)      │
           └───────────────┬───────────────┘
                           │
  ┌────────────────────────▼──────────────────────────────┐
  │  CRUD-слой                                             │
  │  example_sql/crud/crud_users.py → create_user()        │
  │  user = User(**user_create.model_dump())               │
  │  session.add(user) → await session.commit()            │
  │  → await session.refresh(user)                         │
  └────────────────────────┬──────────────────────────────┘
                           │
           ┌───────────────▼───────────────┐
           │  SQLAlchemy AsyncEngine        │
           │  → asyncpg / aiosqlite         │
           │  → PostgreSQL / SQLite         │
           └───────────────┬───────────────┘
                           │
  ┌────────────────────────▼──────────────────────────────┐
  │  Response-сериализация                                 │
  │  response_model=UserResp → pydantic from_attributes    │
  │  → ORJSONResponse → orjson.dumps() → JSON              │
  └────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                        Клиент
```

### 3.2. Запрос с joinedload (`GET /orders/get_all_join`)

```
Клиент → GET /orders/get_all_join?variant=1
  │
  ▼
router_order_one.py → get_all_join()
  │  stmt = select(Order).order_by(Order.id)
  │           .options(joinedload(Order.products))
  │  await db.execute(stmt)
  │  result.unique().scalars().all()
  │
  ├──→ SQL: SELECT orders.*, products.*, association.*
  │         FROM orders
  │         LEFT OUTER JOIN order_product_association AS assoc
  │           ON orders.id = assoc.order_id
  │         LEFT OUTER JOIN products
  │           ON assoc.product_id = products.id
  │         ORDER BY orders.id
  │
  ▼
OrderRespWithProducts (response_model)
  → сериализация с вложенными products: List[ProductResp]
  → ORJSONResponse
```

---

## 4. Управление состоянием, кэшированием и конфигурацией

### 4.1. Управление состоянием

| Уровень | Механизм | Файл |
|---|---|---|
| **Глобальное (процесс)** | `settings = Settings()` — синглтон конфигурации, создаётся при импорте | `core/config.py` |
| **Глобальное (процесс)** | `db_manager = AsyncDbManager(...)` — синглтон engine + sessionmaker, создаётся при импорте | `db_core/db_async.py` |
| **На запрос** | `AsyncSession` через `get_async_session()` — изолированная сессия БД | `db_core/db_async.py` |
| **На запрос** | `Request` / `Response` объекты Starlette — доступны через DI | роутеры |
| **В БД** | Все бизнес-данные (users, posts, orders, products) | PostgreSQL / SQLite |

Кэширование **отсутствует**. Redis объявлен в `nginx_pg_admin.yml`, но не интегрирован в код.

### 4.2. Управление конфигурацией

Файл: `fastapi-application/core/config.py`

Конфигурация построена на `pydantic-settings` (`BaseSettings`):

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / "two.env", BASE_DIR / ".env"),  # порядок приоритета
        env_prefix="APP__",          # все переменные начинаются с APP__
        env_nested_delimiter="__",   # вложенность через __ (APP__DB__URL → settings.db.url)
    )
```

| Подсистема | Класс | Ключевые поля |
|---|---|---|
| Запуск (dev) | `RunConfig` | `host`, `port` |
| Gunicorn (prod) | `GunicornConfig` | `host`, `port`, `workers`, `timeout` |
| База данных | `DatabaseConfig` | `url` (PostgresDsn \| SqliteDsn), `echo`, `pool_size`, `max_overflow`, `naming_convention` |
| API-префиксы | `ApiPrefix` → `ApiV1Prefix` | `/api`, `/v1`, `/users`, `/orders`, имена подроутеров |
| Логирование gunicorn | `LoggingConfigGunicorn` | `log_level`, `log_format` |

### 4.3. Переключение БД

В `config.py` указано `env_file=(BASE_DIR / "two.env", BASE_DIR / ".env")`.
- `two.env` → SQLite (`sqlite+aiosqlite:///./one_simple.db`) — активен по умолчанию.
- `one.env` → PostgreSQL (`postgresql+asyncpg://user:password@localhost:5432/shop`) — закомментирован в `config.py`.

Для переключения нужно изменить `env_file` в `config.py` или создать `.env` с переопределением `APP__DB__URL`.

### 4.4. Naming Convention для БД

`DatabaseConfig.naming_convention` задаёт единые правила именования约束:
`ix_`, `uq_`, `ck_`, `fk_`, `pk_` — используются в Alembic-миграциях и `MetaData`.

---

## 5. Структура роутеров (Routing Map)

```
/ (корень)
├── /docs                         # Swagger UI (custom или дефолтный)
├── /redoc                        # ReDoc
├── /docs/oauth2-redirect         # OAuth2 redirect для Swagger
│
├── /api                          # router_api
│   └── /v1                       # router_api_v1
│       ├── /dep_examples         # router_dep_examples
│       │   ├── /single-direct-dependency
│       │   ├── /single-via-func
│       │   ├── /multi-direct-and-via-func
│       │   ├── /multi-indirect
│       │   ├── /top-level-helper-creation
│       │   ├── /helper-as-dependency
│       │   ├── /great-service-as-dependency
│       │   ├── /path-reader-dependency-from-method
│       │   └── /direct-cls-dependency
│       │
│       ├── /fastapi_class_old            # router_param_fast_cls_old
│       │   └── /my_items/{item_id}       (GET)
│       ├── /fastapi_class_annotated      # router_param_fast_cls
│       │   └── /my_items/{item_id}       (GET)
│       ├── /depends_class_annotated      # router_param_dep_cls
│       │   └── /my_items/{item_id}       (GET)
│       └── /depends_function_annotated   # router_param_dep_func
│           └── /my_items/{item_id}       (GET)
│
├── /users                        # r_users_sql
│   ├── /get_all_users            (GET)
│   └── /create_user              (POST)
│
└── /orders                       # r_order_one
    ├── /add_order                (POST)
    ├── /insert_order             (POST)
    ├── /get_order_filter_by      (GET)
    ├── /get_order_where          (GET)
    ├── /get_all_orders           (GET)
    └── /get_all_join             (GET)
```
