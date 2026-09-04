# 10. Идеи для развития: тесты, конфигурация и инфраструктура

> Идеи-продолжение [04_code_quality.md](04_code_quality.md) и блоков [05](05_patterns_di.md)–[07](07_patterns_data_layer.md). Формат тот же: задача → шаблон кода → куда положить → чему учит → приоритет. Нумерация идей: **T-x** (тесты), **CFG-x** (конфигурация), **INFRA-x** (инфраструктура).
>
> Смежные идеи: [08_ideas_di_api.md](08_ideas_di_api.md), [09_ideas_data_layer.md](09_ideas_data_layer.md).

В проекте **нет ни одного теста**, а в 04 перечислено около десятка конкретных дефектов (P1/P2). Этот файл — план, как превратить находки 04 в исполняемые проверки и добавить инфраструктурные приёмы, которых проект не показывает вовсе.

---

## T-1. Пирамида тестов: три уровня на одном примере

### Какую задачу решает

Дефект P1-1 из 04 (`validate_query_safe` падает на `None` → 500) идеально показывает разницу уровней тестирования: он ловится юнит-тестом валидатора за миллисекунды, интеграционным тестом эндпоинта — за десятки, а e2e-тестом через реальную БД. Один дефект — три теста.

### Шаблон кода

Новые файлы `tests/test_unit_validator.py`, `tests/test_api_users.py`, `tests/test_db_users.py`:

```python
# Уровень 1: юнит — чистая pydantic-модель, без FastAPI и БД
from api.my_routes_dep.pydantic_validator import RespDecorValid
import pytest

def test_validate_query_accepts_none():
    # ловит P1-1: сейчас здесь TypeError → 500
    assert RespDecorValid(path=1, query=None, request=5000).query is None

# Уровень 2: интеграция — приложение целиком, БД подменена (DI-1 из 08)
from fastapi.testclient import TestClient
from main import main_app

def test_my_items_endpoint():
    client = TestClient(main_app)
    resp = client.get("/api/v1/.../my_items/1")
    assert resp.status_code == 200

# Уровень 3: e2e — реальная БД (SQLite dev_sqlite.env) через lifespan
@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=main_app),
                           base_url="http://test") as ac:
        yield ac

async def test_create_and_get_user(client):
    created = await client.post("/users/create_user",
                                json={"nickname": "u1", "password": "p"})
    assert created.status_code == 200
    # ловит P1-2 из 04: пароль не должен возвращаться (см. 07, паттерн 11)
    assert "password" not in created.json()
```

### Чему учит

1. Один дефект — три точки обнаружения; чем раньше уровень, тем дешевле тест.
2. Тесты как исполняемый список дефектов из 04: каждый P1/P2 превращается в падающий тест, потом в фикс, потом в зелёный тест.
3. `httpx.AsyncClient` + `ASGITransport` — современный способ тестировать FastAPI без запуска сервера.

### Куда положить

- `tests/` (новая директория), `pyproject.toml` (зависимости `pytest`, `pytest-asyncio`, `httpx`).
- Приоритет: **высокий** — первый тестовый контур проекта.

---

## T-2. Фикстуры БД: изолированная база на тест

### Какую задачу решает

E2E-тесты из T-1 требуют чистой БД на каждый тест и отката изменений. Штатный приём — фикстура с транзакцией-обёрткой: тест работает внутри транзакции, которая откатывается после.

### Шаблон кода

```python
# tests/conftest.py
import pytest
from db_core.db_async import db_manager

@pytest.fixture
async def session():
    async with db_manager.session_factory() as session:
        async with session.begin():
            yield session
            # begin() автоматически откатит всё при выходе без commit

@pytest.fixture
async def client(session):
    # подмена зависимости (DI-1 из 08): роуты получат транзакционную сессию
    main_app.dependency_overrides[db_manager.get_async_session] = lambda: session
    async with AsyncClient(transport=ASGITransport(app=main_app),
                           base_url="http://test") as ac:
        yield ac
    main_app.dependency_overrides.clear()
```

### Чему учит

1. `session.begin()` как контекст «всё или ничего» — практическое применение контракта из 05 (rollback после yield).
2. Связка фикстур: сессия → клиент → тест. Видно, как тестовая инфраструктура сама построена на DI.
3. Альтернатива для сравнения: `create_all()`/`drop_all()` на in-memory SQLite против миграций Alembic — две стратегии подготовки схемы.

### Куда положить

- `tests/conftest.py`.
- Приоритет: **высокий**.

---

## T-3. Параметризованные тесты на граничные значения валидации

### Какую задачу решает

В 06 разобраны три дефекта валидатора (`None`, пропуск `0`, порт клиента). Все они — граничные случаи, и все ловятся одним параметризованным тестом. Учебный приём «таблица ожиданий» в проекте не показан.

### Шаблон кода

```python
# tests/test_validation_edges.py
@pytest.mark.parametrize(
    ("query_value", "expected_ok"),
    [
        (None,   True),    # P1-1: сейчас падает TypeError
        (1,      True),
        (1000,   True),
        (0,      False),
        (1001,   False),
        (-5,     False),
    ],
)
def test_query_id_boundaries(query_value, expected_ok):
    if expected_ok:
        assert RespDecorValid(path=1, query=query_value, request=5000)
    else:
        with pytest.raises(ValidationError):
            RespDecorValid(path=1, query=query_value, request=5000)
```

### Чему учит

1. Граничные значения (`None`, `0`, `max`, `max+1`) — обязательный набор для любого валидатора.
2. `@pytest.mark.parametrize` читается как таблица спецификации — документация и тест в одном.
3. Прямая связь с уроком 06: «не валидируй то, что не контролируешь» превращается в тест, который запрещает регрессию.

### Куда положить

- `tests/test_validation_edges.py`.
- Приоритет: **средний**.

---

## CFG-1. Тестовый профиль конфигурации: `test.env`

### Какую задачу решает

Проект уже показывает два профиля (`prod_db.env` PostgreSQL / `dev_sqlite.env` SQLite) с переключением правкой кода (01). Третий профиль — `test.env` с in-memory SQLite — делает тесты независимыми от файлов и позволяет сравнить все три диалекта на одном коде.

### Шаблон кода

```env
# fastapi-application/test.env
APP__DB__URL=sqlite+aiosqlite:///:memory:
APP__LOG__LEVEL=WARNING
```

```python
# tests/conftest.py — выбор профиля до импорта settings
import os
os.environ["APP_CONFIG_FILE"] = "test.env"   # или через env в pytest.ini
```

### Чему учит

1. Конфигурация как профили, а не как правки кода — прямое исправление подхода «раскомментировать строку» из 01.
2. `sqlite+aiosqlite:///:memory:` в связке с PRAGMA-хуком из 07 (паттерн 4): in-memory БД живёт на соединение — тесты вскроют нюансы пула.
3. Порядок инициализации: env должен быть установлен **до** импорта `settings` — классическая ловушка синглтона на уровне модуля (та же тема, что в DI-5 из 08).

### Куда положить

- `fastapi-application/test.env`, `tests/conftest.py`, `pyproject.toml` (`[tool.pytest.ini_options]`).
- Приоритет: **высокий**.

---

## CFG-2. Health-check эндпоинты: liveness/readiness

### Какую задачу решает

В проекте нет ни `/health`, ни `/ready` — а в `nginx_pg_admin.yml` уже есть nginx, которому нечего проверять. Два эндпоинта показывают разницу «процесс жив» и «зависимости отвечают» — и попутно дают безопасный способ проверить пул БД.

### Шаблон кода

Новый файл `api/health.py`:

```python
from fastapi import APIRouter
from sqlalchemy import text

router_health = APIRouter(tags=["health"])

@router_health.get("/health")          # liveness: процесс жив, БД не трогаем
async def health() -> dict:
    return {"status": "ok"}

@router_health.get("/ready")           # readiness: зависимости доступны
async def ready(db: CurrentSession) -> dict:
    await db.execute(text("SELECT 1"))
    return {"status": "ready"}
```

И nginx:

```nginx
location /ready { proxy_pass http://app:8000; }
# upstream проверять через max_fails + health_check
```

### Чему учит

1. Разница liveness/readiness — базовый приём для любого деплоя (k8s, docker, nginx).
2. `SELECT 1` — минимальный тест пула соединений; в связке с DI-5 из 08 (lifespan) образует полный цикл жизни движка.
3. Роутер без префикса версии — когда тегирование и префиксы уместны (сравнение с `ApiV1Prefix` из 01).

### Куда положить

- `api/health.py`, include в `main.py`, опционально `nginx/web/`.
- Приоритет: **средний**.

---

## INFRA-1. Dockerfile для приложения + сборка в docker-compose

### Какую задачу решает

`docker-compose.yml` поднимает только pg/adminer/pgadmin (01), а само приложение запускается только через uvicorn/gunicorn локально. Многоступенчатый Dockerfile — самый дефицитный инфраструктурный навык, которого нет в проекте.

### Шаблон кода

```dockerfile
# Dockerfile — multi-stage
FROM python:3.12-slim AS base
WORKDIR /app
COPY pyproject.toml uv.lock ./

FROM base AS deps
RUN pip install uv && uv sync --frozen --no-dev

FROM deps AS runtime
COPY fastapi-application/ ./fastapi-application/
ENV APP__DB__URL=postgresql+asyncpg://user:password@pg:5432/shop
CMD ["uv", "run", "uvicorn", "main:main_app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml — новый сервис
services:
  app:
    build: .
    depends_on:
      pg:
        condition: service_healthy   # pg с healthcheck
```

### Чему учит

1. Multi-stage: слой зависимостей кэшируется отдельно от кода — почему порядок COPY важен.
2. `depends_on` + `condition: service_healthy` — приложение стартует после готовности pg, а не после старта контейнера (классическая ошибка).
3. Связка с DI-5 из 08: в контейнере один процесс — пул до fork() больше не проблема, видно на практике.

### Куда положить

- `Dockerfile` в корне, правка `docker-compose.yml`.
- Приоритет: **средний**.

---

## INFRA-2. CI-пайплайн: линтер + тесты на каждый push

### Какую задачу решает

В 04 конфигурированы ruff и black, но они запускаются только вручную. CI превращает «качество» из 04 в автоматическую проверку и запускает тесты из T-1.

### Шаблон кода

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
        with: { python-version: "3.12" }
      - run: uv sync --frozen
      - run: uv run ruff check .
      - run: uv run black --check -l 79 .
      - run: uv run pytest tests/ -v
```

### Чему учит

1. `uv sync --frozen` — воспроизводимость через лок-файл (в проекте уже есть `uv.lock`, но не показано, зачем он).
2. Порядок шагов: линтер дешевле тестов — падать нужно быстро.
3. Замыкает цикл: дефекты 04 → тесты T-1 → зелёный CI.

### Куда положить

- `.github/workflows/ci.yml`.
- Приоритет: **средний**.

---

## INFRA-3. Структурированные логи запросов через middleware

### Какую задачу решает

`config_log.py` — автономная подсистема логирования (01), но логируются только события приложения, а не запросы. Идея — связать API-2 из 08 (middleware) с логами: каждый запрос логируется с id, методом, путём, статусом и временем в структурном формате.

### Шаблон кода

```python
# api/middleware.py (развитие API-2 из 08)
import time, uuid, logging
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("request")

class RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = request.headers.get("x-request-id", uuid.uuid4().hex[:12])
        started = time.perf_counter()
        response = await call_next(request)
        log.info(
            "request",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "ms": round((time.perf_counter() - started) * 1000, 1),
            },
        )
        response.headers["X-Request-Id"] = request_id
        return response
```

### Чему учит

1. `extra=` и структурированные поля vs f-string — почему «логируй данными, а не строками».
2. `X-Request-Id` — сквозная корреляция запроса между nginx и приложением (связка с nginx из 01).
3. Сравнение с gunicorn-логами из `gunicorn_log.py` (01): три источника логов, три формата, одна система.

### Куда положить

- `api/middleware.py`, опционально правка `config_log.py` (JSON-форматтер).
- Приоритет: **низкий**.

---

## Сводка по файлу

| Идея | Закрывает / добавляет | Приоритет | Новые файлы |
|---|---|---|---|
| T-1 Пирамида тестов | первый тестовый контур; ловит P1-1, P1-2 из 04 | высокий | `tests/` |
| T-2 Фикстуры БД | изоляция e2e-тестов, rollback | высокий | `tests/conftest.py` |
| T-3 Параметризация | граничные случаи валидаторов из 06 | средний | `tests/test_validation_edges.py` |
| CFG-1 Тестовый профиль | профили env вместо правок кода | высокий | `test.env` |
| CFG-2 Health-check | liveness/readiness для nginx | средний | `api/health.py` |
| INFRA-1 Dockerfile | приложение в docker-compose | средний | `Dockerfile` |
| INFRA-2 CI | ruff/black/pytest автоматически | средний | `.github/workflows/ci.yml` |
| INFRA-3 Логи запросов | структурные логи, X-Request-Id | низкий | `api/middleware.py` |

---

## Общий порядок внедрения (все три файла идей)

1. **Контур тестов:** T-1 → T-2 → CFG-1 → T-3 (появляется `tests/`, ловятся дефекты из 04).
2. **DI и API:** DI-1 → DI-4 → API-1 → DI-3 → DI-2 → API-3 → DI-5 → API-2.
3. **Слой данных:** DB-6 → DB-1 → DB-2 → DB-3 → DB-4 → DB-5 → DB-7.
4. **Инфраструктура:** CFG-2 → INFRA-1 → INFRA-2 → INFRA-3.

Логика порядка: сначала тесты (без них правки DI/данных страшно делать), потом DI-контракты (на них опираются тесты), затем данные (используют новые DI-зависимости), инфраструктура — последней, когда всё стабильно.
