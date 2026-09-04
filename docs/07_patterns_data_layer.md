# 07. Чему учит проект: асинхронный слой данных (SQLAlchemy 2.0)

> Часть 7 из 7. См. также: [05_patterns_di.md](05_patterns_di.md), [06_patterns_parameters.md](06_patterns_parameters.md).

Здесь — обучающий разбор асинхронного слоя данных. Это **вторая, рабочая** часть проекта: SQLAlchemy 2.0 async (`AsyncSession`, `asyncpg`/`aiosqlite`), миграции Alembic и две предметные области: `User`/`Post` (one-to-many) и `Order`/`Product` (many-to-many с явной ассоциативной моделью). В отличие от демонстрационной части `api/`, этот слой пригоден как основа реального сервиса.

---

## Паттерн 1. Declarative Base + Convention over Configuration (автоимя таблиц)

`db_core/model_base.py`:

```python
from sqlalchemy.orm import DeclarativeBase, declared_attr
from db_core.case_converter import camel_case_to_snake_case

class Base(DeclarativeBase):
    __abstract__ = True

    metadata = MetaData(naming_convention=settings.db.naming_convention)

    @declared_attr.directive
    def __tablename__(cls) -> str:
        return f"{camel_case_to_snake_case(cls.__name__)}s"
```

### Какую задачу решает

Избавляет от повторения `__tablename__` в каждой модели. Имя таблицы **выводится из имени класса** по правилу: `camel_case` → `snake_case` + суффикс `s` (множественное число).

- `User` → `users`
- `Order` → `orders`
- `Product` → `products`

`camel_case_to_snake_case` (`db_core/case_converter.py`) — единственная функция в проекте с doctest-примерами и корректной обработкой аббревиатур:

```python
>>> camel_case_to_snake_case("SomeSDK")
'some_sdk'
>>> camel_case_to_snake_case("RServoDrive")
'r_servo_drive'
```

### Почему это правильно

1. **DRY.** Правило написано один раз, а не в каждой из ~5 моделей.
2. **Консистентность.** Все таблицы следуют единому стилю именования — легко предсказать имя по классу.
3. **`naming_convention` в `MetaData`** — то, что делает имена констрейнтов детерминированными. Без этого автогенерируемые миграции невоспроизводимы между окружениями. Видно в миграциях: `op.f("pk_users")`, `op.f("fk_order_product_association_order_id_orders")`.

### Почему «не совсем»

**Конвенция ломается на `OrderProductAssociation`**: по правилу вышло бы `order_product_associations`, а таблица ассоциации нужна как `order_product_association` (на неё ссылается `secondary="order_product_association"` в `relationship`). Поэтому там `__tablename__` переопределён вручную. Урок: «convention over configuration» хорош, но требует явного исключения там, где конвенция не подходит — и это нормально, главное, что исключений мало.

---

## Паттерн 2. `Annotated`-типы колонок (DRY на уровне схемы БД)

`db_core/type_for_models.py`:

```python
int_primary_key = Annotated[int, mapped_column(primary_key=True, index=True)]

time_stamp_utc = Annotated[datetime, mapped_column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc),
    server_default=func.now(),
)]

str_len_50 = Annotated[str, mapped_column(String(50))]
str_len_100 = Annotated[str, mapped_column(String(100))]
```

Использование в моделях (`model_user_post.py`):

```python
class User(Base):
    id: Mapped[int_primary_key]
    password: Mapped[str_len_50 | None]
    posts = relationship("Post", back_populates="author", lazy="select", cascade="all, delete")
```

### Какую задачу решает

Убирает повторение `mapped_column(...)` из каждой модели. Повторяющиеся колонки (PK, timestamp, строки фиксированной длины) выносятся в переиспользуемые `Annotated`-типы. Модель читается декларативно: `id: Mapped[int_primary_key]` — «это первичный ключ, как у всех».

### Почему это правильно

1. **DRY на уровне схемы.** Изменение «у всех timestamp теперь timezone-aware» — правка в одном месте.
2. **Читаемость.** `Mapped[str_len_50 | None]` сразу говорит и тип, и ограничение.
3. **`time_stamp_utc` показывает и `default` (Python-сторона), и `server_default` (сторона БД)** — двойной дефолт: Python ставит значение при вставке через ORM, БД — при вставке через SQL мимо ORM. Это правильная защита от NULL.

### Почему «не совсем»

- `int_primary_key` включает `index=True`, но для первичного ключа индекс и так создаётся — `index=True` избыточен (см. 04, «Узкие места»).
- `datetime.now(timezone.utc)` дублируется как `onupdate` в модели `User` — при изменении таймзоны править в двух местах (нарушение DRY, см. 04).
- Альтернатива этому подходу — `IntIdPkMixin` (`model_id_pk_mixin.py`):

  ```python
  class IntIdPkMixin:
      id: Mapped[int] = mapped_column(primary_key=True, index=True)
  ```

  Он применён только в `TestUser`. Два способа решить одну задачу сосуществуют намеренно — демонстрация «как можно и так и так». Для реального проекта стоит выбрать один.

---

## Паттерн 3. One-to-many: `User` → `Post` с каскадом

`example_sql/models/model_user_post.py`:

```python
class User(Base):
    id: Mapped[int_primary_key]
    nickname: Mapped[str] = mapped_column(String(20), unique=True)
    firstname: Mapped[str | None] = mapped_column(String(20))
    surname: Mapped[str | None] = mapped_column(String(20))
    password: Mapped[str_len_50 | None]

    posts = relationship("Post", back_populates="author", lazy="select", cascade="all, delete")

    __table_args__ = (UniqueConstraint(firstname, surname),)


class Post(Base):
    id: Mapped[int_primary_key]
    time_created: Mapped[time_stamp_utc]
    title: Mapped[str_len_50]
    content: Mapped[str]

    user_id = Column(Integer(), ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    author = relationship("User", back_populates="posts")
```

### Какую задачу решает

Показывает классическую связь «один ко многим»: у одного `User` много `Post`. `Post.user_id` — внешний ключ на `users.id`, `relationship` с `back_populates` связывает объекты в обе стороны, `cascade="all, delete"` на стороне `User` означает: при удалении пользователя удаляются и его посты.

### Почему это правильно

- `back_populates` с двух сторон — связь двунаправленная, доступ `user.posts` и `post.author` оба работают.
- `cascade="all, delete"` на родительской стороне + `ondelete="CASCADE"` на FK — каскад продублирован и на уровне ORM, и на уровне БД (см. ниже про `PRAGMA foreign_keys`).
- `unique=True` на `nickname` + `UniqueConstraint(firstname, surname)` — показаны оба способа уникальности: одиночный столбец и составной.

### Почему «не совсем» (важный момент про SQLite)

`ondelete="CASCADE"` в SQLite работает **только если включён PRAGMA `foreign_keys=ON`** — по умолчанию SQLite игнорирует внешние ключи. Проект включает его правильно (см. следующий паттерн). Это классическая ошибка, которую находят месяцами, — отличный учебный кейс.

---

## Паттерн 4. `PRAGMA foreign_keys=ON` для SQLite

`db_core/db_async.py`:

```python
if isinstance(settings.db.url, SqliteDsn):
    @event.listens_for(self.engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
```

### Какую задачу решает

Включает проверку внешних ключей для SQLite. **SQLite по умолчанию не проверяет `FOREIGN KEY`** — каскадные удаления и ссылочная целостность просто не работают. Хук `event.listens_for(..., "connect")` выполняется при каждом новом соединении и включает `PRAGMA foreign_keys=ON`.

### Почему это правильно

- Хук привязан к событию **`connect`** — срабатывает на каждое соединение из пула, а не один раз. Это критично, т.к. PRAGMA — свойство соединения, а не БД.
- Слушает `engine.sync_engine` — для асинхронного движка событие `connect` нужно слушать именно на синхронном «двойнике», к которому привязан DBAPI.
- Условие `isinstance(settings.db.url, SqliteDsn)` — PRAGMA включается **только для SQLite**, для PostgreSQL не применяется.

### Почему «не совсем»

- `os.mkdir`/`os.path.exists` в `config_log.py` — TOCTOU-паттерн (см. 03). Но это про логи, не про БД.
- `isinstance(settings.db.url, SqliteDsn)` означает, что поведение зависит от типа URL — ок для учебного проекта, но в продакшене лучше иметь явный флаг конфигурации.

---

## Паттерн 5. Many-to-many с явной ассоциативной моделью и полезной нагрузкой

`ex_order_product/model_order_product.py`:

```python
class Order(Base):
    id: Mapped[int_primary_key]
    created_at: Mapped[time_stamp_utc]
    promocode: Mapped[str_len_50 | None]

    products_details = relationship("OrderProductAssociation", back_populates="order",
                                    cascade="all, delete", overlaps="orders")
    products = relationship("Product", secondary="order_product_association",
                            back_populates="orders", overlaps="products_details")


class Product(Base):
    id: Mapped[int_primary_key]
    name: Mapped[str_len_50]
    description: Mapped[str_len_100]
    price: Mapped[int]

    orders_details = relationship("OrderProductAssociation", back_populates="product",
                                  cascade="all, delete", overlaps="products")
    orders = relationship("Order", secondary="order_product_association",
                          back_populates="products", overlaps="orders_details")


class OrderProductAssociation(Base):
    __tablename__ = "order_product_association"

    id: Mapped[int_primary_key]
    count = Column(Integer(), default=1, server_default="1")
    unit_price = Column(Integer(), default=0, server_default="0")

    order_id = Column(Integer(), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer(), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    order = relationship("Order", back_populates="products_details", overlaps="orders, products")
    product = relationship("Product", back_populates="orders_details", overlaps="orders, products")

    __table_args__ = (UniqueConstraint(order_id, product_id, name="idx_unique_order_product"),)
```

### Какую задачу решает

Связь «многие ко многим» между `Order` и `Product` **с дополнительными полями** (`count`, `unit_price`) — «сколько товара в заказе и по какой цене». Простой `secondary`-таблицы тут недостаточно: нужна явная модель-ассоциация `OrderProductAssociation`, чтобы хранить нагрузку.

### Почему это правильно

- **Два уровня relationship** на каждом классе: «напрямую к сущности» (`Order.products` → `Product`) и «через ассоциацию» (`Order.products_details` → `OrderProductAssociation`). Это даёт гибкость: когда нужны только товары — `products`; когда нужны количества/цены — `products_details`.
- `UniqueConstraint(order_id, product_id)` — гарантирует, что один и тот же товар не попадёт в заказ дважды (иначе `count` теряет смысл).
- `overlaps=` — явно объявляет, какие пути пересекаются, подавляя предупреждения SQLAlchemy о конфликте имён relationship.
- `default` + `server_default` на `count`/`unit_price` — дублирование дефолта (Python + БД).

### Почему «не совсем»

- `id: Mapped[int_primary_key]` — у ассоциации есть собственный суррогатный PK. Для многих-to-many ассоциаций с `UniqueConstraint(order_id, product_id)` логичнее был бы **составной первичный ключ** `(order_id, product_id)` без отдельного `id`. Отдельный `id` — проще, но допускает избыточность и не соответствует «чистому» паттерну ассоциативной таблицы.
- Дублирование relationship с `overlaps` — код заметно больше, чем для простого `secondary`. Это цена за два уровня доступа.

---

## Паттерн 6. ORM-запись против Core-записи (два пути INSERT)

Проект намеренно показывает два способа вставить запись.

### ORM-путь — `POST /orders/add_order`

```python
@r_order_one.post("/add_order", response_model=OrderResp)
async def add_order(body: OrderCreateBody, db: CurrentSession):
    new_order: Order = Order(**body.model_dump())
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)
    return new_order
```

**Что происходит по шагам:**
1. `Order(**body.model_dump())` — объект в состоянии *transient* (ещё не в сессии).
2. `db.add()` — переводит в *pending*.
3. `await db.commit()` — INSERT + фиксация транзакции.
4. `await db.refresh(new_order)` — обязательный шаг: `expire_on_commit=False` (настройка фабрики), поэтому после коммита атрибуты не инвалидируются, но `id` и `created_at` (из `server_default=func.now()`) сгенерированы **базой** и в объекте отсутствуют. `refresh` дочитывает их из БД.
5. `response_model=OrderResp` с `from_attributes=True` сериализует ORM-объект.

### Core-путь — `POST /orders/insert_order`

```python
@r_order_one.post("/insert_order", response_model=OrderCreateBody)
async def insert_order(db: CurrentSession, body: OrderCreateBody):
    stmt: Insert[Order] = insert(Order).values(**body.model_dump())
    await db.execute(stmt)
    await db.commit()
    return body
```

**Что отличается:**
- SQLAlchemy Core вместо ORM: строится `Insert`-выражение и выполняется через `db.execute`.
- Объект не загружается в identity map, нет `refresh`.
- Возвращается **исходное тело запроса**, а не созданная запись — поэтому `response_model=OrderCreateBody`, а не `OrderResp`, и `id` клиенту не сообщается.

### Почему показаны оба

Учебная ценность — понять разницу между двумя API SQLAlchemy:
- **ORM** — работаешь с объектами, есть `refresh`, `identity map`, но нужен цикл `add → commit → refresh`.
- **Core** — работаешь с выражениями, ближе к SQL, быстрее для массовых операций, но без удобства объектов.

**Оба пути содержат одинаковый дефект:** `OrderResp.promocode` объявлен как `str` без `| None`, а колонка — `Mapped[str_len_50 | None]`. Запрос без `promocode` создаст запись и упадёт с 500 на сериализации ответа (см. 04, P1-3). Урок: response-схема должна допускать те же `None`, что и колонка БД.

---

## Паттерн 7. `filter_by` против `where` (динамические фильтры)

`router_order_one.py` — два обработчика с разным синтаксисом фильтрации.

### `filter_by` — словарь колонок

```python
filter_where = {key: value for key, value in params.model_dump().items() if value is not None}
stmt: Select[tuple[Order]] = select(Order).filter_by(**filter_where)
result = await db.execute(stmt)
order: Order = result.scalar()
```

### `where` — список выражений сравнения

```python
filter_where = [getattr(Order, key) == value for key, value in params.model_dump(exclude_none=True).items()]
stmt: Select[tuple[Order]] = select(Order).where(*filter_where)
orders: Sequence[Order] = result.scalars().all()
```

### Что учит

1. **`filter_by`** принимает `**kwargs` вида `колонка=значение` — удобно, но не умеет операторы (только `==`). `None`-поля приходится отсеивать вручную: `if value is not None`.
2. **`where`** принимает список выражений `Колонка == значение`, строится через `getattr(Order, key)`. Отсев `None` — через `model_dump(exclude_none=True)` — это **однозначно лучший вариант** DRY (см. 04).

**Разница в результате:** первый возвращает **одну** запись (`result.scalar()`), второй — **список** (`result.scalars().all()`), поэтому у них разные `response_model` (`OrderResp` против `OrderResp | list[OrderResp]`).

### Почему «не совсем»

- Оба используют **`409 CONFLICT` для «не найдено»** — семантически корректно `404 NOT FOUND` (см. 04, P2-2).
- `get_order_filter_by` при пустом наборе фильтров строит `select(Order)` без `WHERE`; `result.scalar()` при нескольких строках бросит `MultipleResultsFound` → 500 (P2-3).
- `getattr(Order, key)` — потенциально опасно, если `key` приходит извне без валидации. Здесь `key` берётся из pydantic-модели с фиксированными полями, так что риск низкий, но в реальном проекте лучше whitelist (см. следующий паттерн).

---

## Паттерн 8. Whitelist-сортировка вместо `getattr` (защита от SQL-инъекции)

`router_order_one.py`:

```python
@r_order_one.get("/get_all_orders", response_model=list[OrderResp])
async def get_all_orders(db: CurrentSession, params: OrderGetAllOrderbyQuery):
    if params == "time":
        order_by_list_o = [Order.created_at, Order.id]
    elif params == "promocode":
        order_by_list_o = [Order.promocode, Order.created_at]
    else:
        order_by_list_o = [Order.id, Order.created_at]

    stmt = select(Order).order_by(*order_by_list_o)
    ...
```

`params` — `OrderGetAllOrderbyQuery`, наследующий `str, Enum`:

```python
class OrderGetAllOrderbyQuery(str, Enum):
    id = "id"
    time = "time"
    promocode = "promocode"
```

### Какую задачу решает

Динамический выбор порядка сортировки по query-параметру без риска SQL-инъекции через имя колонки.

### Почему это правильно — и почему `getattr` был бы ошибкой

Наивный вариант — `getattr(Order, params)` и подстановка в `order_by`. Но тогда злоумышленник мог бы передать в `params` произвольное имя и при определённых условиях повлиять на SQL. **Whitelist-подход** (фиксированные ветки `if/elif/else`) исключает это полностью: возможны только три заранее известных варианта. Это правильное решение, которое часто делают неправильно — отличный учебный пример.

### Почему «не совсем»

- `Enum` наследует `str`, поэтому сравнение `params == "time"` работает, но явнее было бы `params is OrderGetAllOrderbyQuery.time`. Это чисто стилистика.
- FastAPI сам отрендерит `str, Enum` как выпадающий список в Swagger и вернёт 422 на неизвестное значение — это плюс, о котором стоит знать.

---

## Паттерн 9. `joinedload` + обязательный `.unique()` (загрузка связей)

`router_order_one.py`:

```python
@r_order_one.get("/get_all_join", response_model=list[OrderRespWithProducts])
async def get_all_join(db: CurrentSession, variant: int = 1):
    stmt = (
        select(Order)
        .order_by(Order.id)
        .options(joinedload(Order.products))
    )
    await_result_execute = await db.execute(stmt)

    if variant == 1:
        result_scalars_all = await_result_execute.unique().scalars().all()
        order0, order1 = result_scalars_all[0], result_scalars_all[1]
    else:
        result_all = await_result_execute.unique().all()
        order0 = result_all[0][0]
        order1 = result_all[1][0]
    ...
    return result_scalars_all
```

### Какую задачу решает

Загружает заказы вместе с их товарами **одним запросом** (через `LEFT OUTER JOIN`), чтобы избежать N+1-проблемы (по одному запросу на каждый заказ).

### Почему `.unique()` обязателен

`joinedload` на **коллекции** (у заказа много товаров) порождает **декартово произведение**: каждая строка результата — пара «заказ × товар». Один заказ встречается столько раз, сколько у него товаров. Без `.unique()` SQLAlchemy поднимет `InvalidRequestError` — повторный объект в identity map. `.unique()` дедуплицирует заказы. Это одна из тех ошибок, которую находят месяцами, и проект правильно демонстрирует исправление.

### Смысл `variant`

Показать два способа разобрать один и тот же `Result`:
- `variant=1` — `.unique().scalars().all()` → сразу список ORM-объектов `Order`.
- `variant=2` — `.unique().all()` → список `Row`, из которого берётся `row[0]`.

Оба эквивалентны; разница — в форме доступа к результату.

### Почему «не совсем»

1. **Жёстко зашитые индексы `[0]`/`[1]`** нужны только для логирования. На пустой или односоставной таблице — `IndexError` → 500 (см. 04, P1-4). Диагностический код в продакшн-пути.
2. `joinedload` на коллекции раздувает запрос декартовым произведением. На больших наборах эффективнее **`selectinload`** (два запроса: отдельно заказы, отдельно связи) — в коде есть закомментированная строка `.options(selectinload(Order.products))`. Урок: `joinedload` хорош для many-to-one, для коллекций чаще предпочтителен `selectinload`.
3. Нет пагинации — возвращается вся таблица (см. 04).

---

## Паттерн 10. Иерархия response-схем под стратегии загрузки (Composition)

`ex_order_product/schema_order_product.py`:

```python
class OrderProductBase(BaseModel):
    class Config:
        from_attributes = True

class OrderResp(OrderProductBase):
    id: int
    created_at: datetime
    promocode: str

class OrderRespWithProducts(OrderResp):
    products: List[ProductResp]

class OrderRespWithAssoc(OrderResp):
    products_details: List[AssociationResp]

class OrderRespWithProductsAssoc(OrderResp):
    products: List[ProductResp]
    products_details: List[AssociationResp]

class OrderRespWithProductsDetails(OrderResp):
    products: List[ProductRespWithsAssoc]
```

### Какую задачу решает

Строит **дерево схем ответов** так, чтобы каждому набору `joinedload`/`selectinload` соответствовала своя схема:

```
OrderProductBase (from_attributes = True)
└── OrderResp
    ├── OrderRespWithProducts        products: List[ProductResp]
    ├── OrderRespWithAssoc           products_details: List[AssociationResp]
    ├── OrderRespWithProductsAssoc   оба поля
    └── OrderRespWithProductsDetails products: List[ProductRespWithsAssoc]
```

### Почему это правильно

- **Interface Segregation (SOLID):** клиент получает ровно тот набор полей, который соответствует стратегии загрузки в запросе, — не отдаётся лишнего.
- **Open/Closed:** дерево расширяется наследованием без правки базовых классов — добавить `OrderRespWithSomething` можно, не трогая `OrderResp`.
- `from_attributes=True` (через `Config`) позволяет сериализовать ORM-объекты напрямую.

### Почему «не совсем»

- `promocode: str` без `| None` — несовместимо с колонкой `Mapped[str_len_50 | None]` (P1-3, 500 при отсутствии промокода). Урок: схема ответа должна допускать те же `None`, что и колонка.
- `class Config:` — устаревший синтаксис pydantic v1; в v2 рекомендуется `model_config = ConfigDict(from_attributes=True)` (в `schema_user.py` это сделано правильно). Ещё один показательный нюанс версий pydantic.

---

## Паттерн 11. Слой приложения (CRUD) — правильная организация vs SQL в роутах

Проект показывает **два уровня архитектуры** предметных областей, чтобы было что сравнить.

### Правильный вариант: `example_sql/` (с CRUD-слоем)

`example_sql/crud/crud_users.py`:

```python
async def get_all_users(session: AsyncSession) -> Sequence[User]:
    stmt = select(User).order_by(User.id)
    result = await session.scalars(stmt)
    return result.all()

async def create_user(session: AsyncSession, user_create: UserCreate) -> User:
    user = User(**user_create.model_dump())
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user
```

Обработчик (`router_users.py`) не строит SQL, а делегирует в слой приложения:

```python
@r_users_sql.get("/get_all_users", response_model=list[UserResp])
async def get_users(session: CurrentSession):
    users = await users_crud.get_all_users(session=session)
    return users
```

### «Не совсем» вариант: `ex_order_product/` (SQL прямо в роутах)

В `router_order_one.py` все шесть обработчиков строят `Select`/`Insert` и вызывают `db.execute()` напрямую — CRUD-слоя нет.

### Что учит

- **Функциональный репозиторий** — модуль свободных функций, принимающих `session` первым аргументом. Сессия передаётся извне, не создаётся внутри — функции тестируемы и композируемы в одной транзакции. Это правильный, минималистичный вариант Repository/DAO.
- **Дефект композиции:** `create_user` сам вызывает `session.commit()`. Это значит, что две CRUD-операции нельзя объединить в одну транзакцию — коммит произойдёт внутри каждой. Для «одной функции = одна операция» это ок, но для составных операций нужен коммит снаружи. Урок из 02.
- **Сравнение архитектур:** `ex_user_post` показывает, как отделять HTTP-контракт от доступа к данным; `ex_order_product` показывает, как **не надо** — слой приложения отсутствует, связность роута низкая (см. 04).

### Почему «не совсем» (критично для безопасности)

В `schema_user.py`:

```python
class UserCreate(BaseModel):
    nickname: str
    firstname: str | None
    surname: str | None
    password: str

class UserResp(UserCreate):      # ← наследует password!
    id: int
    model_config = ConfigDict(from_attributes=True)
```

`UserResp` **наследует `password`** от `UserCreate`. Так как `UserResp` используется как `response_model` в обоих эндпоинтах `/users/*`, `GET /users/get_all_users` отдаёт пароли **всех** пользователей, а `POST /users/create_user` — пароль созданного. При этом пароли хранятся в открытом виде (хеширования нет). Это P1-дефект (см. 04). Правильный паттерн — общая база без `password`:

```python
class UserBase(BaseModel):
    nickname: str
    firstname: str | None
    surname: str | None

class UserCreate(UserBase):
    password: str

class UserResp(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
```

**Урок:** схема ответа не должна наследоваться от схемы запроса, если в запросе есть секретные поля.

---

## Итог по слою данных

| Паттерн | Что учит | Оценка |
|---|---|---|
| Автоимя таблиц + naming_convention | Convention over Configuration | ✅ правильно |
| `Annotated`-типы колонок | DRY на уровне схемы | ✅ правильно |
| One-to-many с каскадом | Связи, `back_populates`, `cascade` | ✅, но нужно `PRAGMA` |
| `PRAGMA foreign_keys=ON` | Ключевой нюанс SQLite | ✅ правильно |
| Many-to-many с нагрузкой | Два уровня relationship, `overlaps` | ✅, но лишний `id` |
| ORM vs Core запись | Два API SQLAlchemy | ✅ демонстрация |
| `filter_by` vs `where` | Динамические фильтры | ⚠️ 409, `scalar()` |
| Whitelist-сортировка | Защита от инъекции | ✅ правильно |
| `joinedload` + `.unique()` | Загрузка связей без N+1 | ✅, но индексы `[0]/[1]` ❌ |
| Иерархия response-схем | Composition, segregation | ✅, но `promocode: str` ❌ |
| CRUD-слой vs SQL в роутах | Слоистая архитектура | ✅ в `ex_user_post`, ❌ в `ex_order_product` |

**Главные сквозные уроки блока:**
1. SQLite без `PRAGMA foreign_keys=ON` молча игнорирует внешние ключи — включайте его.
2. `joinedload` на коллекции требует `.unique()`, а для больших наборов лучше `selectinload`.
3. Response-схема должна допускать те же `None`, что и колонка БД, и **не наследовать секретные поля** от схемы запроса.
4. Имена таблиц и констрейнтов должны быть детерминированными (`naming_convention`), иначе миграции невоспроизводимы.
5. Слой приложения (CRUD) отделяет HTTP от доступа к данным; коммит лучше держать снаружи для композиции транзакций.

---

# Сводный указатель: чему учит проект (все три файла 05–07)

| Тема | Правильный приём | Где в коде | Файл доки |
|---|---|---|---|
| Ресурсный DI + teardown | `Annotated[AsyncSession, Depends(генератор)]` | `db_core/db_async.py` | 05 |
| Параметризованная зависимость | фабрика-замыкание | `api/dependencies/func_deps.py` | 05 |
| Класс как зависимость | 3 варианта (`__init__`/`__call__`/метод-генератор) | `api/dependencies/` | 05 |
| Параметры эндпоинта | `Annotated[int, Path(...)]` | `api/my_routes_dep/` | 06 |
| Валидация | `Annotated` + `AfterValidator` + `Field(ge=,le=)` | `api/my_routes_dep/pydantic_validator.py` | 06 |
| Имена таблиц | Convention over Configuration | `db_core/model_base.py` | 07 |
| Типы колонок | `Annotated`-алиасы | `db_core/type_for_models.py` | 07 |
| SQLite FK | `PRAGMA foreign_keys=ON` | `db_core/db_async.py` | 07 |
| Загрузка связей | `joinedload` + `.unique()` | `router_order_one.py` | 07 |
| Безопасная сортировка | Whitelist вместо `getattr` | `router_order_one.py` | 07 |
| Слоистая архитектура | CRUD-слой отдельно от роутов | `example_sql/` | 07 |
