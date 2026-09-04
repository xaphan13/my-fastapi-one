# 08. Идеи для развития: DI и API-слой (продолжение блока 05)

> Идеи-продолжение [05_patterns_di.md](05_patterns_di.md) и [06_patterns_parameters.md](06_patterns_parameters.md).
> Формат: для каждой идеи — какую задачу решает, шаблон кода, куда положить в проект, чему учит и приоритет.
> Нумерация идей: **DI-x** — зависимости, **API-x** — механика эндпоинтов.

Блоки 05–07 разбирают то, что в проекте **уже есть**. Этот и два следующих файла — «бэклог»: приёмы, которых в проекте нет, но которые идеально ложатся в его главную идею — *показать один и тот же результат несколькими способами рядом*. Все идеи подобраны так, чтобы дополнять существующие паттерны, а не дублировать их.

---

## DI-1. Dependency Override как учебный паттерн (мок сессии БД)

### Какую задачу решает

В 05 разобран главный дефект текущего DI: `db_manager` создаётся на импорте, и подменить сессию в тестах негде. FastAPI даёт для этого штатный механизм — `app.dependency_overrides`. Сейчас в проекте он не показан вообще, хотя это **первое, что нужно знать про DI в FastAPI** после `Depends`.

### Шаблон кода

Новый файл `tests/conftest.py` (или демо-роут `api/dependencies/dep_override_demo.py`):

```python
from fastapi.testclient import TestClient
from db_core.db_async import db_manager
from main import main_app

# Подмена зависимости: вместо реальной БД — объект-пустышка
class FakeSession:
    async def scalars(self, stmt):
        return [User(id=1, nickname="fake")]

async def override_session():
    yield FakeSession()

main_app.dependency_overrides[db_manager.get_async_session] = override_session

client = TestClient(main_app)

def test_get_all_users():
    resp = client.get("/users/get_all_users")
    assert resp.status_code == 200
    assert resp.json()[0]["nickname"] == "fake"
```

### Чему учит

1. Ключ подмены — **та же самая функция-генератор**, которую использует `Annotated`-алиас `CurrentSession`. Это замыкает цикл: «алиас из 05 → его тестовая подмена».
2. Override — это тоже DI: тестовый контейнер зависимостей.
3. Наглядно показывает, зачем нужен паттерн «класс чистый, его собирает фабрика» (вариант C из 05): `FakeSession` не должен наследовать `AsyncSession`.

### Куда положить

- `tests/conftest.py` + `tests/test_users_api.py` — первый тестовый модуль проекта.
- Приоритет: **высокий** — закрывает главный «не совсем» из 05.

---

## DI-2. Зависимость с параметрами запроса: пагинация

### Какую задачу решает

В 07 отмечено: `get_all_orders` возвращает всю таблицу без пагинации. Пагинация — идеальный «второй» пример фабрики-замыкания (паттерн 2 из 05): она же зависит от query-параметров, то есть **комбинирует DI и извлечение параметров** (мост между блоками 05 и 06).

### Шаблон кода

Новый файл `api/dependencies/pagination.py`:

```python
from dataclasses import dataclass
from typing import Annotated
from fastapi import Depends, Query

@dataclass(frozen=True, slots=True)
class Pagination:
    limit: int
    offset: int

def pagination_factory(
    max_limit: int = 100,                       # конфигурация — на этапе сборки
) -> Pagination:
    def dependency(
        limit: Annotated[int, Query(ge=1, le=max_limit)] = 20,
        offset: Annotated[int, Query(ge=0)] = 0,
    ) -> Pagination:
        return Pagination(limit=limit, offset=offset)
    return dependency

PageParams = Annotated[Pagination, Depends(pagination_factory())]
```

Использование в `router_order_one.py`:

```python
@r_order_one.get("/get_all_orders", response_model=list[OrderResp])
async def get_all_orders(db: CurrentSession, page: PageParams):
    stmt = select(Order).order_by(Order.id).limit(page.limit).offset(page.offset)
    ...
```

### Чему учит

1. Синтез паттернов 05 и 06: замыкание + `Query` + класс-контейнер параметров (как `QueryData` из стиля 3).
2. `dataclass(frozen=True)` — иммутабельный контейнер, параллель к `frozen=True` из `RespAfterValid` (06).
3. Прямое исправление дефекта «нет пагинации» из 04/07 — идея сразу улучшает проект.

### Вариации для сравнения (в духе проекта)

- Вариант A — как выше (фабрика-замыкание + dataclass).
- Вариант B — класс с `__init__`-аннотациями: `class Pagination: def __init__(self, limit: Annotated[int, Query()] = 20, ...)`.
- Вариант C — pydantic-модель с `Query`-аннотациями полей.

Три файла рядом — готовый учебный блок «три стиля пагинации».

### Куда положить

- `api/dependencies/pagination.py` (+ варианты B/C в отдельных файлах), подключение в `ex_order_product/router_order_one.py`.
- Приоритет: **высокий**.

---

## DI-3. Зависимость-аутентификация: OAuth2 + JWT + timing-safe сравнение

### Какую задачу решает

В 05 вариант B (`HeaderAccessDependency`) сравнивает токен через `!=` — уязвимость к timing-атаке, и токен захардкожен. Логичный учебный следующий шаг — **правильная** версия того же паттерна: полноценная зависимость аутентификации. Она же закрывает P1-дефект из 07 (пароли в открытом виде).

### Шаблон кода

Новый файл `api/dependencies/auth.py`:

```python
import secrets
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt  # pyjwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

class AuthUserDependency:
    def __init__(self, secret_key: str, algorithm: str = "HS256") -> None:
        self.secret_key = secret_key          # конфигурация — из settings
        self.algorithm = algorithm

    def __call__(self, token: Annotated[str, Depends(oauth2_scheme)]) -> TokenPayload:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except jwt.InvalidTokenError as e:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=str(e))
        return TokenPayload(**payload)
```

И хеширование пароля вместо открытого хранения:

```python
from pwdlib import PasswordHash
password_hash = PasswordHash.recommended()

async def create_user(session: AsyncSession, user_create: UserCreate) -> User:
    user = User(
        **user_create.model_dump(exclude={"password"}),
        password=password_hash.hash(user_create.password),  # хеш, не пароль
    )
    ...
```

### Чему учит

1. Тот же паттерн «экземпляр с `__call__`» (05, вариант B), но с конфигурацией из `settings` вместо хардкода — прямое сравнение «до/после».
2. `Depends(oauth2_scheme)` внутри `__call__` — **композиция зависимостей внутри класса** (развитие паттерна 4 из 05).
3. Swagger автоматически получает кнопку Authorize — видно, как зависимость меняет OpenAPI-схему.
4. Закрывает дефекты: хардкод токена, `!=`-сравнение, открытые пароли.

### Куда положить

- `api/dependencies/auth.py`, правки в `ex_user_post/schemas/schema_user.py` (UserBase/UserCreate/UserResp — паттерн из 07), роут `/users/login`.
- Приоритет: **высокий** — закрывает P1-дефекты 04/07.

---

## DI-4. Зависимость-генератор с транзакционным контрактом «commit-or-rollback»

### Какую задачу решает

В 05 отмечен контракт текущей сессии: «откатывает, но не коммитит», и обработчик обязан помнить про `commit()`. В 07 — дефект композиции: `create_user` коммитит внутри CRUD-функции, поэтому две операции нельзя объединить в одну транзакцию. Идея — показать **вторую** зависимость с противоположным контрактом и сравнить.

### Шаблон кода

Новый файл `db_core/db_async_tx.py`:

```python
class TransactionalSession:
    """Сессия с контрактом: коммит в конце запроса, откат при исключении."""

    async def __call__(self) -> AsyncGenerator[AsyncSession, None]:
        async with db_manager.session_factory() as session:
            try:
                yield session
                await session.commit()      # коммит — ответственность DI, не бизнес-логики
            except Exception:
                await session.rollback()
                raise

CurrentTxSession = Annotated[AsyncSession, Depends(TransactionalSession())]
```

Теперь CRUD-функции **не коммитят**:

```python
async def create_user(session: AsyncSession, user_create: UserCreate) -> User:
    user = User(**user_create.model_dump())
    session.add(user)
    await session.flush()      # получаем id без завершения транзакции
    return user
```

И составная операция становится возможной:

```python
@r_users_sql.post("/register_with_post")
async def register_with_post(body: UserWithPostBody, session: CurrentTxSession):
    user = await users_crud.create_user(session, body.user)       # без commit
    await posts_crud.create_post(session, body.post, user.id)     # та же транзакция
    return user                                                    # commit произойдёт в DI
```

### Чему учит

1. Два контракта одной зависимости рядом: `CurrentSession` (коммитит бизнес-логика) vs `CurrentTxSession` (коммитит DI) — в духе главной идеи проекта.
2. `flush()` vs `commit()` — ключевое различие, которого в проекте нет вообще.
3. Unit of Work «бесплатно»: коммит в teardown генератора — развитие паттерна teardown из 05 (вариант C).
4. Прямое исправление дефекта композиции транзакций из 07.

### Куда положить

- `db_core/db_async_tx.py`, демо-роут в `ex_user_post/router_users.py`.
- Приоритет: **высокий**.

---

## DI-5. Lifespan-ресурсы: создание движка не на импорте, а при старте

### Какую задачу решает

В 05/04 отмечено: `db_manager` создаётся на импорте, пул не переживает `fork()` gunicorn. Правильное решение — создавать/закрывать движок в `lifespan`. В проекте `lifespan` уже есть (`create_fastapi.py`), но пустой по смыслу — идеальное место для второго урока.

### Шаблон кода

Правка `create_fastapi.py`:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup: движок живёт ровно столько, сколько живёт процесс
    await db_manager.startup()          # create_async_engine здесь, а не на импорте
    yield
    # shutdown: корректно закрыть пул соединений
    await db_manager.shutdown()         # await engine.dispose()
```

И `AsyncDbManager` превращается в ленивый:

```python
class AsyncDbManager:
    def __init__(self, url: str):
        self._url = url
        self.engine: AsyncEngine | None = None

    def startup(self) -> None:
        self.engine = create_async_engine(self._url, ...)
        self.session_factory = async_sessionmaker(bind=self.engine, ...)

    async def shutdown(self) -> None:
        if self.engine is not None:
            await self.engine.dispose()
```

### Чему учит

1. Жизненный цикл приложения: `lifespan` — это «DI уровня процесса», симметрия с «DI уровня запроса» (`Depends`).
2. Почему движок нельзя создавать до `fork()` — практический урок из 04, превращённый в код.
3. `engine.dispose()` — про него в проекте нет ни слова.

### Куда положить

- `create_fastapi.py`, `db_core/db_async.py`.
- Приоритет: **средний** — меняет точку сборки, требует проверки gunicorn-сценария.

---

## API-1. Кастомные исключения + один глобальный обработчик

### Какую задачу решает

В 07: «не найдено» возвращается как `409 CONFLICT`, а `MultipleResultsFound` даёт необработанный 500. Оба случая — повод показать паттерн «домен бросает исключение → API-слой маппит его в HTTP». Сейчас в проекте нет ни одного `exception_handler`.

### Шаблон кода

Новые файлы `ex_order_product/exceptions.py` и правка `create_fastapi.py`:

```python
# exceptions.py — доменные исключения, не знают про HTTP
class OrderNotFoundError(Exception):
    def __init__(self, order_id: int):
        self.order_id = order_id

# create_fastapi.py — маппинг домен → HTTP в одном месте
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(OrderNotFoundError)
async def order_not_found_handler(request: Request, exc: OrderNotFoundError):
    return JSONResponse(
        status_code=404,   # вместо 409 — правильная семантика
        content={"detail": f"Order {exc.order_id} not found"},
    )
```

В роуте:

```python
order = result.scalar_one_or_none()
if order is None:
    raise OrderNotFoundError(order_id=params.id)   # вместо ручного 409
```

### Чему учит

1. `scalar_one_or_none()` против `scalar()` — прямое исправление P2-3 из 04 (500 при нескольких строках).
2. Слоистость: домен не импортирует FastAPI — продолжение урока «CRUD-слой отделяет HTTP от данных» (07, паттерн 11).
3. Один обработчик вместо `HTTPException` в каждом роуте — DRY на уровне ошибок.

### Куда положить

- `ex_order_product/exceptions.py`, правки `router_order_one.py`, регистрация в `create_fastapi.py`.
- Приоритет: **высокий** — закрывает P2-дефекты 04.

---

## API-2. Middleware как «зависимость всего приложения»

### Какую задачу решает

В 06 ответ модифицируется вручную в каждом обработчике (`response.headers[...]`, `set_cookie`). Идея — показать тот же результат **одним middleware** и сравнить: что уместно на уровне запроса (DI), а что на уровне приложения (middleware). Плюс в 03/06 отмечено, что `request.client.port` за nginx врёт — middleware `ProxyHeadersMiddleware` лечит это одной строкой.

### Шаблон кода

Новый файл `api/middleware.py`:

```python
import time
from starlette.middleware.base import BaseHTTPMiddleware

class TimingHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
        return response

# create_fastapi.py
app.add_middleware(TimingHeaderMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")  # за nginx
```

### Чему учит

1. Сравнение трёх точек модификации запроса/ответа: DI-зависимость (05/06), обработчик (06), middleware (здесь) — у каждой свой охват и цена.
2. `BaseHTTPMiddleware` vs чистый ASGI-middleware — можно показать оба, в духе проекта.
3. `ProxyHeadersMiddleware` — закрывает замечание про порт клиента из 03/06.

### Куда положить

- `api/middleware.py`, регистрация в `create_fastapi.py`.
- Приоритет: **средний**.

---

## API-3. BackgroundTasks: ответ сразу, работа потом

### Какую задачу решает

В проекте вообще нет фоновых задач — а это штатный механизм FastAPI, тесно связанный с DI (задачу можно инъектировать как зависимость). Учебный сценарий: после создания заказа — «отправить уведомление» не блокируя ответ.

### Шаблон кода

Новый файл `ex_order_product/tasks.py` + правка роута:

```python
# tasks.py
import logging
log = logging.getLogger(__name__)

async def notify_order_created(order_id: int) -> None:
    log.info("Sending notification for order %s ...", order_id)
    await asyncio.sleep(2)          # имитация долгой работы
    log.info("Notification sent")

# router_order_one.py
from fastapi import BackgroundTasks

@r_order_one.post("/add_order", response_model=OrderResp)
async def add_order(body: OrderCreateBody, db: CurrentSession,
                    background: BackgroundTasks):
    new_order = Order(**body.model_dump())
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    background.add_task(notify_order_created, new_order.id)   # после ответа
    return new_order
```

### Чему учит

1. Время жизни `BackgroundTasks`: выполняется **после** отправки ответа, но до teardown зависимостей — тонкость, которую мало кто знает (сессия БД в задаче ещё жива).
2. Задачу можно получить и через `Depends(BackgroundTasks)` — снова композиция с DI.
3. Граница применимости: когда задачу уже надо выносить в Celery/arq — важный «почему не совсем».

### Куда положить

- `ex_order_product/tasks.py`, правка `router_order_one.py`.
- Приоритет: **средний**.

---

## Сводка по файлу

| Идея | Закрывает дефект | Приоритет | Новые файлы |
|---|---|---|---|
| DI-1 Dependency Override | «db_manager на импорте» (05) | высокий | `tests/conftest.py` |
| DI-2 Пагинация (3 стиля) | нет пагинации (04/07) | высокий | `api/dependencies/pagination*.py` |
| DI-3 OAuth2/JWT + хеши | хардкод токена, пароли открыто (04/05/07) | высокий | `api/dependencies/auth.py` |
| DI-4 Commit-or-rollback | дефект композиции транзакций (07) | высокий | `db_core/db_async_tx.py` |
| DI-5 Lifespan-движок | пул до fork() (04/05) | средний | правки `create_fastapi.py` |
| API-1 Исключения → HTTP | 409 вместо 404, 500 на scalar() (04/07) | высокий | `ex_order_product/exceptions.py` |
| API-2 Middleware | порт за nginx (03/06) | средний | `api/middleware.py` |
| API-3 BackgroundTasks | — | средний | `ex_order_product/tasks.py` |
