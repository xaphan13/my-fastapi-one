# 05 — Предложения по развитию (Optimization Roadmap)

> Документ содержит архитектурные улучшения, оптимизации производительности,
> план рефакторинга и рекомендации по DX.

---

## 1. Архитектурные улучшения

### 1.1. Устранение циклической зависимости `db_core` ↔ бизнес-модули

**Проблема:** `db_core/__init__.py` импортирует ORM-модели из `example_sql` и `ex_order_product`.
Это создаёт циклическую зависимость: инфраструктурный слой зависит от бизнес-слоя.

**Решение:** Alembic `env.py` должен импортировать модели напрямую:

```python
# alembic/env.py — вместо "from db_core import Base"
from db_core.model_base import Base
from example_sql.models.model_user_post import User, Post
from ex_order_product.model_order_product import Order, Product, OrderProductAssociation

target_metadata = Base.metadata
```

Удалить импорты моделей из `db_core/__init__.py`. Оставить только `Base`.

**Приоритет:** Высокий
**Усилие:** Низкое

### 1.2. Внедрение слоя CRUD для `ex_order_product`

**Проблема:** SQL-запросы находятся прямо в роутере `router_order_one.py`.

**Решение:** Создать `ex_order_product/crud/crud_orders.py` с функциями:

```python
async def create_order(session: AsyncSession, body: OrderCreateBody) -> Order: ...
async def get_order_by_filter(session: AsyncSession, filters: dict) -> Order | None: ...
async def get_orders_where(session: AsyncSession, filters: dict) -> Sequence[Order]: ...
async def get_all_orders(session: AsyncSession, order_by: list) -> Sequence[Order]: ...
async def get_all_orders_with_products(session: AsyncSession) -> Sequence[Order]: ...
```

Роутер вызывает CRUD-функции, не содержит SQL.

**Приоритет:** Высокий
**Усилие:** Среднее

### 1.3. Dependency Injection для `db_manager` и `settings`

**Проблема:** Глобальные синглтоны `settings` и `db_manager` создаются при импорте — нельзя подменить в тестах.

**Решение:** Использовать паттерн `get_settings()` / `get_db_manager()` как FastAPI-зависимости:

```python
# db_core/db_async.py
async def get_db_manager() -> AsyncGenerator[AsyncDbManager, None]:
    yield db_manager  # или создавать per-app

# В роутере:
session: Annotated[AsyncSession, Depends(get_async_session)]
```

Для тестов — переопределение зависимости через `app.dependency_overrides`.

**Приоритет:** Средний
**Усилие:** Среднее

### 1.4. Пагинация для всех list-эндпоинтов

**Проблема:** `get_all_users`, `get_all_orders`, `get_all_join` возвращают все записи — риск OOM.

**Решение:** Добавить параметры `limit: int = 50` и `offset: int = 0`:

```python
@r_users_sql.get("/get_all_users", response_model=list[UserResp])
async def get_users(session: CurrentSession, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return await users_crud.get_all_users(session=session, limit=limit, offset=offset)
```

В CRUD: `select(User).order_by(User.id).limit(limit).offset(offset)`.

**Приоритет:** Высокий
**Усилие:** Низкое

### 1.5. Кэширование (Redis)

**Проблема:** Redis объявлен в `nginx_pg_admin.yml`, но не используется. GET-запросы к БД на каждый вызов.

**Решение:** Интегрировать `redis.asyncio` для кэширования read-heavy эндпоинтов:

```python
# core/redis.py
from redis.asyncio import Redis
redis = Redis.from_url(settings.redis.url)

# В роутере:
@r_order_one.get("/get_all_orders", response_model=list[OrderResp])
async def get_all_orders(db: CurrentSession, redis: CurrentRedis, ...):
    cache_key = f"orders:all:{params}"
    cached = await redis.get(cache_key)
    if cached:
        return orjson.loads(cached)
    orders = await crud.get_all_orders(...)
    await redis.setex(cache_key, 60, orjson.dumps(orders))
    return orders
```

**Приоритет:** Средний
**Усилие:** Среднее

### 1.6. Аутентификация и авторизация

**Проблема:** Все эндпоинты открыты. Пароли хранятся в открытом виде.

**Решение:**
1. Хеширование паролей через `passlib[bcrypt]` или `argon2-cffi`:
   ```python
   password: Mapped[str]  # хранится как bcrypt-hash
   # В схеме:
   class UserCreate(BaseModel):
       password: str  # plain text от клиента → хешируется перед сохранением
   ```
2. JWT-аутентификация через `python-jose` или `pyjwt`:
   ```python
   # core/security.py
   from fastapi_security import OAuth2PasswordBearer
   oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
   ```
3. Зависимость `get_current_user` для защищённых роутов.

**Приоритет:** Высокий
**Усилие:** Высокое

### 1.7. CORS Middleware

**Решение:**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors.origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Приоритет:** Высокий (для prod)
**Усилие:** Низкое

### 1.8. Health Check эндпоинт

```python
@app.get("/health")
async def health_check(db: CurrentSession):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "healthy", "db": "connected"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")
```

**Приоритет:** Средний
**Усилие:** Низкое

---

## 2. Оптимизация производительности

### 2.1. Пагинация (см. 1.4)

Устраняет full table scan + загрузку всех записей в память.

### 2.2. `selectinload` вместо `joinedload` для many-to-many

**Проблема:** `joinedload(Order.products)` в `get_all_join` декартово умножает строки (orders × products × association), что приводит к дубликатам и необходимости `.unique()`.

**Решение:** Для collection-связей `selectinload` эффективнее:

```python
.options(selectinload(Order.products))
# SELECT * FROM orders WHERE id IN (...)     — один запрос
# SELECT * FROM association JOIN products ... — второй запрос
```

Затем `.scalars().all()` без `.unique()`.

**Приоритет:** Средний
**Усилие:** Низкое

### 2.3. Индексы для часто фильтруемых полей

**Проблема:** `get_order_filter_by` и `get_order_where` фильтруют по `id`, `created_at`, `promocode`, но индексы есть только на `id`.

**Решение:** Добавить индексы:
```python
# Order
created_at: Mapped[...] = mapped_column(index=True)
promocode: Mapped[...] = mapped_column(index=True)
```

Создать миграцию Alembic.

**Приоритет:** Средний
**Усилие:** Низкое

### 2.4. Настройка пула соединений

**Проблема:** `pool_size=50, max_overflow=10` — по умолчанию. При `gunicorn --workers=4` это до 240 соединений (4 × 60), что может превысить `max_connections` PostgreSQL (по умолчанию 100).

**Решение:**
- Уменьшить `pool_size` до 10-20 для prod.
- Добавить `pool_recycle=3600` (реклайн соединений каждый час).
- Добавить `pool_pre_ping=True` (проверка соединения перед использованием).

```python
self.engine = create_async_engine(
    url=url, pool_size=pool_size, max_overflow=max_overflow,
    pool_recycle=3600, pool_pre_ping=True,
)
```

**Приоритет:** Высокий (для prod)
**Усилие:** Низкое

### 2.5. Устранение избыточного логирования

**Проблема:** 2-3 вызова `logF.info` в каждом роутере с дублирующейся информацией. В prod это замедляет обработку и раздувает лог-файлы.

**Решение:**
- Удалить отладочные логи из prod-роутеров (`router_order_one.py`, `my_param_*.py`).
- Использовать middleware для единообразного логирования запросов:
  ```python
  @app.middleware("http")
  async def log_requests(request: Request, call_next):
      start = time.perf_counter()
      response = await call_next(request)
      duration = time.perf_counter() - start
      logF.info(f"{request.method} {request.url.path} → {response.status_code} ({duration:.3f}s)")
      return response
  ```

**Приоритет:** Низкий
**Усилие:** Низкое

---

## 3. Рефакторинг — первоочередные файлы

| # | Файл | Обоснование | Действие |
|---|---|---|---|
| 1 | `ex_order_product/router_order_one.py` | SQL в роутере, нарушение SRP, баг с `variant`, неверные HTTP-коды | Вынести CRUD, добавить пагинацию, исправить `409→404`, убрать хардкод `variant` |
| 2 | `db_core/__init__.py` | Циклическая зависимость с бизнес-модулями | Удалить импорт моделей, оставить только `Base` |
| 3 | `db_core/db_async.py` | Нет `pool_pre_ping`, `pool_recycle`; `cursor.close()` без `try/finally` | Добавить параметры пула, безопасный cursor |
| 4 | `example_sql/models/model_user_post.py` + `schemas/schema_user.py` | Пароли в открытом виде | Добавить хеширование, убрать `password` из `UserResp` |
| 5 | `config_log.py` | 6 неиспользуемых форматов, мёртвый код, `os.mkdir` вместо `Path.mkdir` | Упростить до 1 формата + 1 хендлера, использовать `pathlib` |
| 6 | `ex_order_product/schema_order_product.py` | 6 мёртвых классов, `class Config` (v1), `Optional`/`List` (v0) | Удалить неиспользуемые схемы, мигрировать на Pydantic v2 |
| 7 | `Makefile` | `up`/`down` перепутаны | Исправить семантику целей |
| 8 | `core/config.py` | Хардкод `env_file` с закомментированным `one.env` | Использовать переменную `APP_ENV` для выбора профиля |

---

## 4. Рекомендации по DX (Developer Experience)

### 4.1. Тестирование

**Текущее состояние:** Тесты полностью отсутствуют.

**Рекомендация:** Внедрить `pytest` + `pytest-asyncio` + `httpx` (AsyncClient):

```
tests/
├── conftest.py              # фикстуры: test_app, test_db (SQLite in-memory), test_client
├── test_users.py            # интеграционные тесты CRUD users
├── test_orders.py           # интеграционные тесты CRUD orders + join
├── test_dependencies.py     # unit-тесты зависимостей (HeaderAccessDependency, etc.)
└── test_params.py           # тесты извлечения параметров (4 подхода)
```

```python
# tests/conftest.py
@pytest_asyncio.fixture
async def test_app():
    # переопределение CurrentSession на in-memory SQLite
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # ...
    app.dependency_overrides[get_async_session] = get_test_session
    yield app
    app.dependency_overrides.clear()
```

Добавить в `pyproject.toml`:
```toml
[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-asyncio>=0.23", "httpx>=0.27"]
```

**Приоритет:** Высокий
**Усилие:** Среднее

### 4.2. CI/CD

**Рекомендация:** Минимальный GitHub Actions / GitLab CI:

```yaml
# .github/workflows/ci.yml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run black --check .

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: {POSTGRES_DB: shop, POSTGRES_USER: user, POSTGRES_PASSWORD: password}
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync
      - run: uv run pytest -v
```

**Приоритет:** Средний
**Усилие:** Низкое

### 4.3. Локальный запуск

**Текущее состояние:** Makefile с целями для Linux/Windows, но цели `up`/`down` перепутаны.

**Рекомендации:**
1. Исправить Makefile:
   ```makefile
   up:
   	docker-compose -f docker-compose.yaml up -d
   down:
   	docker-compose -f docker-compose.yaml down
   build:
   	docker-compose -f docker-compose.yaml build
   ```
2. Добавить цель `dev`:
   ```makefile
   dev:
   	uv run uvicorn main:main_app --app-dir fastapi-application --host 0.0.0.0 --port 8000 --reload
   ```
3. Добавить цель `migrate`:
   ```makefile
   migrate:
   	cd fastapi-application && uv run alembic upgrade head
   ```
4. Добавить `pre-commit` хуки для `ruff` и `black`.

**Приоритет:** Низкий
**Усилие:** Низкое

### 4.4. Документация API

**Текущее состояние:** OpenAPI генерируется автоматически; кастомные `/docs` и `/redoc` опциональны.

**Рекомендации:**
- Добавить `description` и `version` в `FastAPI(...)` конструктор.
- Добавить `tags_metadata` для группировки эндпоинтов.
- Добавить `examples` в Pydantic-схемы для лучшей документации.

**Приоритет:** Низкий
**Усилие:** Низкое

### 4.5. Конфигурация окружений

**Проблема:** Переключение БД (SQLite ↔ PostgreSQL) требует редактирования `config.py`.

**Решение:** Использовать переменную `APP_ENV`:

```python
# config.py
import os
env = os.getenv("APP_ENV", "dev")
env_files = {
    "dev": BASE_DIR / "two.env",    # SQLite
    "prod": BASE_DIR / "one.env",   # PostgreSQL
}
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(env_files[env], BASE_DIR / ".env"),
        ...
    )
```

**Приоритет:** Средний
**Усилие:** Низкое

---

## 5. Итоговая приоритетная матрица

| Приоритет | Задача | Усилие | Эффект |
|---|---|---|---|
| 🔴 Критический | Хеширование паролей | Среднее | Безопасность |
| 🔴 Критический | Аутентификация (JWT) | Высокое | Безопасность |
| 🔴 Критический | CORS middleware | Низкое | Безопасность |
| 🟠 Высокий | Устранение циклической зависимости `db_core` | Низкое | Архитектура |
| 🟠 Высокий | CRUD-слой для `ex_order_product` | Среднее | Архитектура |
| 🟠 Высокий | Пагинация list-эндпоинтов | Низкое | Производительность |
| 🟠 Высокий | Настройка пула (`pool_pre_ping`, `pool_recycle`) | Низкое | Надёжность |
| 🟠 Высокий | Тесты (pytest + httpx) | Среднее | DX / Надёжность |
| 🟡 Средний | Exception handlers для БД-ошибок | Низкое | Надёжность |
| 🟡 Средний | Health-check эндпоинт | Низкое | Надёжность |
| 🟡 Средний | `selectinload` вместо `joinedload` | Низкое | Производительность |
| 🟡 Средний | Индексы на `created_at`, `promocode` | Низкое | Производительность |
| 🟡 Средний | Конфигурация окружений (`APP_ENV`) | Низкое | DX |
| 🟡 Средний | CI/CD pipeline | Низкое | DX |
| 🟢 Низкий | Удаление мёртвого кода (схемы, форматы логов) | Низкое | Читаемость |
| 🟢 Низкий | Упрощение `config_log.py` | Низкое | Читаемость |
| 🟢 Низкий | Исправление Makefile | Низкое | DX |
| 🟢 Низкий | Миграция `schema_order_product.py` на Pydantic v2 | Низкое | Технический долг |
