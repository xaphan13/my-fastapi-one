# 01 — Карта проекта (`my-fastapi-one`)

> Документ-источник истины о структуре репозитория.
> Предназначен для разработчиков и AI-агентов (Claude Code, OpenCode, Aider).

---

## 1. Назначение проекта

`my-fastapi-one` — учебно-демонстрационный асинхронный REST-API на базе **FastAPI** + **SQLAlchemy 2.0 (async)** + **Alembic**. Проект иллюстрирует три основных направления:

1. **Извлечение параметров запроса** (Path / Query / Header / Cookie / Request / Response) — четыре идиоматических подхода: классы FastAPI, `Annotated`-стиль, классы-зависимости (`Depends`), функции-зависимости.
2. **CRUD-операции с БД** через асинхронные сессии SQLAlchemy (модуль `example_sql` — сущности `User`/`Post`).
3. **Сложные реляционные связи** many-to-many (`Order` ↔ `Product` через ассоциативную таблицу `OrderProductAssociation`) с использованием `joinedload` и `selectinload`.

Проект поддерживает два движка БД: **PostgreSQL** (через `asyncpg`) и **SQLite** (через `aiosqlite`), переключаемых переменной окружения. Запуск возможен через `uvicorn` (dev/reload) или `gunicorn` + `UvicornWorker` (prod).

---

## 2. Дерево директорий и ключевых файлов

```
my-fastapi-one/
├── pyproject.toml                          # Конфигурация проекта uv/pip: зависимости, ruff, black
├── uv.lock                                 # Зафиксированные версии зависимостей (uv)
├── .python-version                         # Версия Python = 3.12 (для pyenv/uv)
├── Makefile                                # Make-цели: run, docker, alembic (Linux/Windows)
├── docker-compose.yml                      # Контейнеры: PostgreSQL, Adminer, pgAdmin4
├── nginx_pg_admin.yml                      # Альтернативный compose: PostgreSQL + pgAdmin + Redis + Nginx
├── Install-run.md                          # Краткая инструкция по запуску (uvicorn/gunicorn)
├── adminDock.sh                            # Bash-скрипт управления Docker-контейнерами и сетью
├── adminGit.sh                             # Bash-скрипт-обёртка над git-командами
├── .dockerignore                           # Исключения для Docker-сборки
│
├── nginx/                                  # Конфигурация Nginx (reverse-proxy / TLS)
│   ├── Docker-nginx                        # Dockerfile для Nginx-контейнера
│   ├── nginx.conf                          # Конфигурация Nginx
│   └── web/                                # Статические файлы / дефолтная страница
│
├── docs/                                   # Документация проекта (этот и смежные файлы)
│
└── fastapi-application/                    # === КОРНЕВОЙ ПАКЕТ ПРИЛОЖЕНИЯ ===
    │
    ├── main.py                             # Точка входа (dev): создаёт FastAPI-приложение,
    │                                       #   регистрирует роутеры, запускает uvicorn с reload
    ├── main_gunicorn.py                    # Точка входа (prod): запускает приложение через
    │                                       #   кастомный gunicorn-app с UvicornWorker
    ├── create_fastapi.py                   # Фабрика create_app(): создаёт FastAPI, настраивает
    │                                       #   lifespan, ORJSONResponse, кастомные docs-роуты
    ├── base_dir_path.py                    # Глобальные пути: DIR_CWD (cwd), BASE_DIR (директория приложения)
    ├── config_log.py                       # Конфигурация логирования (dictConfig, RotatingFileHandler,
    │                                       #   консольный handler; логгеры: OnlyFile, FileStdout, Stdout)
    ├── alembic.ini                         # Конфигурация Alembic (file_template, post_write_hooks=black)
    ├── one.env                             # Env-профиль: PostgreSQL (asyncpg://localhost:5432/shop)
    ├── two.env                             # Env-профиль: SQLite (sqlite+aiosqlite:///./one_simple.db)
    │
    ├── core/                               # === КОНФИГУРАЦИЯ И ИНФРАСТРУКТУРА ===
    │   ├── __init__.py
    │   ├── config.py                       # Settings (pydantic-settings): GunicornConfig, RunConfig,
    │   │                                   #   ApiPrefix, DatabaseConfig, LoggingConfigGunicorn.
    │   │                                   #   Чтение из .env с префиксом APP__ и вложенным разделителем __
    │   └── gunicorn/                       # Кастомная интеграция gunicorn
    │       ├── __init__.py
    │       ├── gunicorn_app.py             # MyGunicornApp(BaseApplication) — адаптер FastAPI→gunicorn
    │       ├── gunicorn_opt.py             # get_app_options() — словарь опций (bind, workers, timeout, ...)
    │       └── gunicorn_log.py             # GunicornLogger(Logger) — кастомный формат логов gunicorn
    │
    ├── db_core/                            # === СЛОЙ БАЗЫ ДАННЫХ ===
    │   ├── __init__.py                     # Реэкспорт Base + всех ORM-моделей для Alembic autogenerate
    │   ├── db_async.py                     # AsyncDbManager: async_engine, async_sessionmaker,
    │   │                                   #   get_async_session() (генератор с rollback),
    │   │                                   #   CurrentSession (Annotated-зависимость для DI)
    │   ├── model_base.py                   # Base(DeclarativeBase): MetaData с naming_convention,
    │   │                                   #   авто-генерация __tablename__ из CamelCase→snake_case
    │   ├── type_for_models.py              # Переиспользуемые Annotated-типы колонок:
    │   │                                   #   int_primary_key, time_stamp_utc, str_len_50, str_len_100
    │   └── case_converter.py               # camel_case_to_snake_case() — утилита конвертации имён
    │
    ├── api/                                # === СЛОЙ API (роутеры, зависимости) ===
    │   ├── __init__.py                     # router_api (prefix=/api) → router_api_v1 (prefix=/v1)
    │   │                                   #   → подключение router_dep_examples, router_param_extract
    │   ├── dependencies/                   # Демонстрация паттернов Dependency Injection
    │   │   ├── __init__.py                 # router_dep_examples (tags=["Dependencies Examples"])
    │   │   ├── dep_examp_simple.py         # Роуты: прямые Header, Depends(функция), мульти-зависимости
    │   │   ├── dep_examp_cls.py            # Роуты: классы как зависимости (GreatService, PathReader, ...)
    │   │   ├── func_deps.py                # Функции-зависимости: get_x_foo_bar, get_header_dependency,
    │   │   │                               #   get_great_helper (фабрика GreatHelper)
    │   │   ├── cls_deps.py                 # Классы-зависимости: PathReaderDependency (generator-yield),
    │   │   │                               #   HeaderAccessDependency (__call__, валидация токена),
    │   │   │                               #   TokenData / TokenIntrospectResult (pydantic-модели)
    │   │   └── helper.py                   # GreatHelper / GreatService / BaseGreat — value-объекты
    │   │
    │   └── my_routes_dep/                  # Демонстрация извлечения параметров (4 подхода)
    │       ├── __init__.py                 # router_param_extract → 4 подроутера с разными prefix
    │       ├── my_param_fast_cls.py        # Подход 1: классы Path/Query/Header/Cookie (old-style)
    │       ├── my_param_fast_ann.py        # Подход 2: Annotated + классы (modern-style)
    │       ├── my_param_dep_cls.py         # Подход 3: классы-зависимости (Depends + __init__)
    │       ├── my_param_dep_func.py        # Подход 4: функции-зависимости (Depends + функция)
    │       ├── dep_cls_schema.py           # Классы PathData/QueryData/HeaderData/CookieData (для подхода 3)
    │       ├── dep_func_schema.py          # Функции get_item_id/get_param_id/get_user_id/get_number_req
    │       ├── pydantic_schema.py          # Response-модели: RespFieldStyle, RespAnnotated
    │       └── pydantic_validator.py       # Response-модели с валидацией: RespAfterValid (Annotated+AfterValidator),
    │                                       #   RespDecorValid (field_validator); типы PathID, QueryID, PortNumber
    │
    ├── example_sql/                        # === БИЗНЕС-МОДУЛЬ: Users & Posts (one-to-many) ===
    │   ├── __init__.py
    │   ├── router_users.py                 # Роуты: GET /users/get_all_users, POST /users/create_user
    │   ├── schemas/
    │   │   ├── __init__.py
    │   │   └── schema_user.py              # Pydantic-схемы: UserCreate, UserResp, PostCreate, PostResp
    │   ├── models/
    │   │   ├── __init__.py
    │   │   ├── model_user_post.py          # ORM: User (nickname, firstname, surname, password, posts),
    │   │   │                               #   Post (title, content, time_created, author) — one-to-many
    │   │   ├── model_user_mix.py           # ORM: TestUser (IntIdPkMixin + Base) — демонстрация mixin
    │   │   └── model_id_pk_mixin.py        # IntIdPkMixin — переиспользуемый mixin для primary key
    │   └── crud/
    │       ├── __init__.py
    │       └── crud_users.py               # CRUD-функции: get_all_users (select+order_by),
    │                                       #   create_user (add+commit+refresh)
    │
    ├── ex_order_product/                   # === БИЗНЕС-МОДУЛЬ: Orders & Products (many-to-many) ===
    │   ├── __init__.py
    │   ├── router_order_one.py             # Роуты: add_order, insert_order, get_order_filter_by,
    │   │                                   #   get_order_where, get_all_orders, get_all_join (joinedload)
    │   ├── schema_order_product.py         # Pydantic-схемы: Order*, Product*, Association*,
    │   │                                   #   респонсы с вложенными связями (WithProducts, WithAssoc, ...)
    │   └── model_order_product.py          # ORM: Order, Product, OrderProductAssociation
    │                                       #   (many-to-many через secondary + association-объект)
    │
    ├── alembic/                            # === МИГРАЦИИ БД ===
    │   ├── env.py                          # Async-окружение Alembic: подставляет settings.db.url,
    │   │                                   #   target_metadata=Base.metadata, run_async_migrations()
    │   └── versions/
    │       ├── 2026-01-15_11-15--59bdab4b2e7c--user_post.py       # Миграция: таблицы users, posts
    │       └── 2026-01-15_11-19--35ae229e79dd--order_product.py   # Миграция: orders, products, association
    │
    └── utils/                              # === УТИЛИТЫ ===
        ├── __init__.py
        └── docs.py                         # reg_docs_routes() — кастомные /docs, /redoc, oauth2-redirect
```

---

## 3. Внешние зависимости и их роль

### 3.1. Python-зависимости (из `pyproject.toml`)

| Зависимость | Версия | Роль в проекте |
|---|---|---|
| `fastapi` | `>=0.111.0` | Веб-фреймворк: роутинг, DI, валидация, OpenAPI |
| `uvicorn[standard]` | `>=0.40.0` | ASGI-сервер (dev-режим, reload); `UvicornWorker` для gunicorn |
| `gunicorn` | `>=23.0.0,<24` | WSGI/ASGI-менеджер процессов (prod-режим, multi-worker) |
| `sqlalchemy[asyncio]` | `>=2.0.30,<3` | ORM + async-engine + async-sessionmaker |
| `asyncpg` | `>=0.31.0` | Асинхронный драйвер PostgreSQL |
| `aiosqlite` | `>=0.22.1` | Асинхронный драйвер SQLite (для тестов/dev) |
| `alembic` | `>=1.13.1,<2` | Миграции схемы БД (autogenerate) |
| `pydantic[email]` | `>=2.7.1,<3` | Валидация данных, response-models, схемы |
| `pydantic-settings` | `>=2.2.1,<3` | Чтение конфигурации из `.env` (BaseSettings) |
| `orjson` | `>=3.11.5` | Быстрый JSON-сериализатор (`ORJSONResponse`) |
| `ruff` | `>=0.14.10` | Линтер (F401, E402, F541 игнорируются) |
| `black` | `>=25.0.0` | Форматирование кода (line-length=120); post-write-hook в Alembic |

### 3.2. Внешние сервисы (инфраструктура)

| Сервис | Конфигурация | Роль |
|---|---|---|
| **PostgreSQL** | `docker-compose.yml`: `postgres:latest`, порт `5432`, DB=`shop`, user=`user` | Основная БД для prod-режима |
| **SQLite** | Локальный файл `./one_simple.db` | Dev/тестовая БД (переключается через `two.env`) |
| **Adminer** | `docker-compose.yml`: порт `8080` | Web-UI для управления БД |
| **pgAdmin4** | `docker-compose.yml`: порт `5050`; `nginx_pg_admin.yml`: порт `5123` | Альтернативный Web-UI для PostgreSQL |
| **Redis** | `nginx_pg_admin.yml`: `redis:6.2-alpine`, порт `7079` | Объявлен в compose, но **не используется** в коде приложения |
| **Nginx** | `nginx_pg_admin.yml` + `nginx/` | Reverse-proxy / TLS-терминация (конфигурация в `nginx/nginx.conf`) |

### 3.3. Менеджер окружения

Проект использует **`uv`** (файл `uv.lock`, секция `[tool.uv]` в `pyproject.toml`, `package = false`).
Python `>=3.12` (`.python-version`).
