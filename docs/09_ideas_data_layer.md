# 09. Идеи для развития: слой данных (продолжение блока 07)

> Идеи-продолжение [07_patterns_data_layer.md](07_patterns_data_layer.md). Формат тот же: задача → шаблон кода → куда положить → чему учит → приоритет. Нумерация идей: **DB-x**.
>
> См. также смежные идеи API-уровня: [08_ideas_di_api.md](08_ideas_di_api.md).

Блок 07 разобрал 11 паттернов существующего слоя данных. Здесь — паттерны, которых в проекте **нет**, но которые завершают картину «настоящего» async-слоя: репозиторий, Unit of Work, upsert, мягкое удаление, полнотекстовые/JSON-поля, оптимистичная блокировка.

---

## DB-1. Repository на `Protocol`: репозиторий, который можно подменить в тесте

### Какую задачу решает

В 07 паттерн 11 хвалит `example_sql` за функциональный CRUD-слой, но там же сказано: функции тестируемы, только если подменяема сессия. Полноценный шаг дальше — **интерфейс репозитория** через `typing.Protocol`: роут зависит от абстракции, реализация (SQLAlchemy или in-memory fake) подменяется через `Depends`. Это соединяет слой данных с DI-блоком 05.

### Шаблон кода

Новые файлы `example_sql/repositories/interfaces.py`, `.../sqlalchemy_repo.py`:

```python
# interfaces.py — абстракция, ноль импортов SQLAlchemy
from typing import Protocol
from example_sql.schemas.schema_user import UserCreate

class UsersRepository(Protocol):
    async def get_all(self) -> Sequence[User]: ...
    async def get_by_id(self, user_id: int) -> User | None: ...
    async def create(self, data: UserCreate) -> User: ...

# sqlalchemy_repo.py — реализация
class SqlAlchemyUsersRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_all(self) -> Sequence[User]:
        result = await self.session.scalars(select(User).order_by(User.id))
        return result.all()

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

# зависимость-фабрика
def get_users_repository(session: CurrentSession) -> UsersRepository:
    return SqlAlchemyUsersRepository(session)

UsersRepo = Annotated[UsersRepository, Depends(get_users_repository)]

# роут — зависит только от Protocol
@r_users_sql.get("/get_all_users", response_model=list[UserResp])
async def get_users(repo: UsersRepo):
    return await repo.get_all()
```

Тестовая подмена — через `dependency_overrides` (идея DI-1):

```python
class InMemoryUsersRepository:
    def __init__(self): self._users: list[User] = []
    async def get_all(self): return self._users
    ...

main_app.dependency_overrides[get_users_repository] = lambda: InMemoryUsersRepository()
```

### Чему учит

1. `Protocol` (structural typing): репозиторий не наследует интерфейс — достаточно совпадения сигнатур. Python-иконичный приём, которого нет в проекте.
2. Замыкает цепочку «CRUD-функции (07) → репозиторий → DI (05) → override в тестах (DI-1)».
3. Роут перестаёт знать про SQLAlchemy вовсе — предельная форма урока «CRUD-слой отделяет HTTP от данных».

### Куда положить

- `example_sql/repositories/` (interfaces, sqlalchemy, in_memory для тестов), правка `router_users.py`.
- Приоритет: **высокий** — это «недостающий этаж» архитектуры из 02.

---

## DB-2. Upsert: `insert().on_conflict_do_update()`

### Какую задачу решает

В 07 паттерн 6 показывает ORM- и Core-INSERT, но не показывает третью операцию — «вставь или обнови». Для `OrderProductAssociation` с `UniqueConstraint(order_id, product_id)` это самый естественный сценарий: добавление товара в заказ не должно падать по unique-конфликту, а должно увеличивать `count`.

### Шаблон кода

Правка `ex_order_product/router_order_one.py` (или новый CRUD-модуль `ex_order_product/crud/`):

```python
from sqlalchemy.dialects.postgresql import insert as pg_insert

async def add_product_to_order(db: CurrentSession, body: AssociationAddBody):
    stmt = (
        pg_insert(OrderProductAssociation)
        .values(**body.model_dump())
        .on_conflict_do_update(
            constraint="idx_unique_order_product",        # из __table_args__ (07, паттерн 5)
            set_={"count": OrderProductAssociation.count + body.count},
        )
        .returning(OrderProductAssociation)
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.scalar_one()
```

### Чему учит

1. Диалект-специфичные конструкции (`sqlalchemy.dialects.postgresql`) vs универсальный Core — важная развилка; для SQLite есть `on_conflict_do_update` в `sqlite`-диалекте, что даёт готовое сравнение профилей `prod_db.env`/`dev_sqlite.env`.
2. `returning(...)` — получение записи без второго SELECT и без ORM-цикла `add → commit → refresh` (прямое сравнение с паттерном 6 из 07).
3. Инкремент `count + body.count` вычисляется **на стороне БД** — атомарность без блокировок.

### Куда положить

- `ex_order_product/crud/crud_association.py` + роут `POST /orders/{id}/products`.
- Приоритет: **средний**.

---

## DB-3. Мягкое удаление: `deleted_at` + фильтр по умолчанию

### Какую задачу решает

Сейчас удаление — только физическое (`cascade="all, delete"` из 07). Мягкое удаление — классический паттерн, который хорошо сочетается с уже имеющимися `Annotated`-типами колонок (паттерн 2 из 07): добавляем один тип — и все модели получают поведение.

### Шаблон кода

Правки `db_core/type_for_models.py` и моделей:

```python
# type_for_models.py — новый Annotated-тип (продолжение паттерна 2 из 07)
soft_delete_stamp = Annotated[
    datetime | None,
    mapped_column(DateTime(timezone=True), default=None),
]

# model_user_post.py
class User(Base):
    deleted_at: Mapped[soft_delete_stamp]

    def soft_delete(self) -> None:
        self.deleted_at = datetime.now(timezone.utc)
```

И запрос «только живые» — переиспользуемое условие:

```python
# example_sql/crud/filters.py
def alive(model: type[Base]) -> ColumnElement[bool]:
    return model.deleted_at.is_(None)

stmt = select(User).where(alive(User)).order_by(User.id)
```

### Чему учит

1. Расширение собственной библиотеки `Annotated`-типов — логичное продолжение `int_primary_key`/`time_stamp_utc`.
2. Метод `soft_delete()` на модели vs сервисная функция — микро-сравнение в духе проекта.
3. Ловушка: `unique=True` на `nickname` конфликтует с мягким удалением («удалённый» ник блокирует повторную регистрацию) — отличный материал для раздела «почему не совсем».

### Куда положить

- `db_core/type_for_models.py`, `model_user_post.py`, `crud/filters.py`, миграция Alembic.
- Приоритет: **средний**.

---

## DB-4. Оптимистичная блокировка: колонка `version`

### Какую задачу решает

Ни один эндпоинт проекта не обновляет записи (`UPDATE` отсутствует полностью!). Идея — добавить обновление сразу с правильной защитой от потерянных обновлений: колонка `version`, инкрементируемая SQLAlchemy при каждом UPDATE.

### Шаблон кода

Новая модель/колонка и обновление:

```python
class Product(Base):
    ...
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    __mapper_args__ = {"version_id_col": version}   # включает оптимистичную блокировку
```

```python
# обновление цены двумя конкурентными запросами
product.price = new_price
await db.commit()
# если другой запрос уже обновил запись —
# StaleDataError: UPDATE затронул 0 строк вместо 1
```

Обработка в API-слое (связка с идеей API-1 из 08):

```python
try:
    ...
except StaleDataError:
    raise HTTPException(status.HTTP_409_CONFLICT, "Record was modified concurrently")
```

### Чему учит

1. Первая в проекте демонстрация `UPDATE` — закрывает пробел «есть только SELECT и INSERT».
2. Оптимистичная vs пессимистичная блокировка (`with_for_update()`) — можно показать оба варианта на одном эндпоинте, в духе проекта.
3. `StaleDataError` → `409 CONFLICT` — здесь 409 наконец уместен (сравнить с ошибочным 409 из паттерна 7 блока 07).

### Куда положить

- `model_order_product.py`, новый роут `PATCH /products/{id}`, миграция.
- Приоритет: **средний**.

---

## DB-5. Пакетные операции: `bulk` insert и `executemany`

### Какую задачу решает

Паттерн 6 из 07 сравнивает ORM и Core для **одной** записи. Естественное продолжение — сравнение для **многих**: `session.add_all()` vs `session.scalars(...).all()`-цикл vs один `insert().values([...])`.

### Шаблон кода

Новый демо-роут `POST /orders/insert_orders_bulk`:

```python
@r_order_one.post("/insert_orders_bulk", response_model=list[OrderResp])
async def insert_orders_bulk(db: CurrentSession, bodies: list[OrderCreateBody]):
    # Вариант A: ORM — объекты попадают в identity map
    orders = [Order(**b.model_dump()) for b in bodies]
    db.add_all(orders)
    await db.commit()

    # Вариант B: Core executemany — один INSERT с множеством VALUES,
    # быстрее, но объектов и их id у клиента нет
    # await db.execute(insert(Order), [b.model_dump() for b in bodies])

    return orders
```

### Чему учит

1. Цена ORM: identity map и `refresh` удобны, но на тысячах записей `executemany` выигрывает кратно — измеримо (можно добавить лог времени и сравнить в Swagger).
2. `Session` и «flush по частям» — почему большие батчи в ORM надо делить.
3. Продолжение главного сравнения паттерна 6 из 07 на новый уровень.

### Куда положить

- `router_order_one.py` (или `crud/crud_orders.py`, если делать DB-6).
- Приоритет: **низкий**.

---

## DB-6. CRUD-слой для `ex_order_product` — закрыть «плохой» пример правильным

### Какую задачу решает

В 07 паттерн 11 `ex_order_product` назван «не совсем»-вариантом: SQL прямо в роутах. Идея — не переписывать его (он учебный), а добавить **третий** домен-эталон: `ex_order_product/crud/`, куда переезжают все шесть запросов из роута. Получится тройное сравнение: «SQL в роуте (плохо) → CRUD-функции (хорошо) → Repository на Protocol (DB-1, идеально)».

### Шаблон кода

```python
# ex_order_product/crud/crud_orders.py
async def get_order_by_filter(
    session: AsyncSession,
    filters: OrderSearchParams,
) -> Sequence[Order]:
    filter_where = [
        getattr(Order, key) == value
        for key, value in filters.model_dump(exclude_none=True).items()
    ]
    stmt = select(Order).where(*filter_where).order_by(Order.id)
    result = await session.scalars(stmt)
    return result.all()
```

Роут сжимается до:

```python
@r_order_one.get("/get_order_where", response_model=list[OrderResp])
async def get_order_where(db: CurrentSession, params: OrderSearchParams):
    return await orders_crud.get_order_by_filter(session=db, filters=params)
```

### Чему учит

1. Три уровня организации кода данных в одном проекте — финальная точка урока из 07.
2. `model_dump(exclude_none=True)` из паттерна 7 переезжает в CRUD без изменений — видно, что логика запросов переносима между уровнями.
3. Подготовка к DB-1: CRUD-функции тривиально заворачиваются в репозиторий.

### Куда положить

- `ex_order_product/crud/` (новый пакет), правка `router_order_one.py`.
- Приоритет: **высокий** — минимальными правками делает «плохой» домен пригодным для копирования.

---

## DB-7. JSON-колонка и гибридные атрибуты

### Какую задачу решает

В проекте все колонки — примитивы. `JSONB`-колонка (для PostgreSQL) + `hybrid_property` показывают «сложные» типы данных и вычисляемые атрибуты, доступные и в Python, и в SQL-фильтрах.

### Шаблон кода

```python
from sqlalchemy import JSON
from sqlalchemy.ext.hybrid import hybrid_property

class Order(Base):
    ...
    meta: Mapped[dict] = mapped_column(JSON, default=dict, server_default="{}")

    @hybrid_property
    def items_count(self) -> int:
        # Python-сторона: работает на объекте
        return sum(a.count for a in self.products_details)

    @items_count.expression
    def items_count(cls):
        # SQL-сторона: работает в select(Order).where(Order.items_count > 5)
        return (
            select(func.coalesce(func.sum(OrderProductAssociation.count), 0))
            .where(OrderProductAssociation.order_id == cls.id)
            .scalar_subquery()
        )
```

### Чему учит

1. `hybrid_property` — один атрибут, два мира (Python/SQL): прямое развитие темы «ORM vs Core» из 07.
2. JSON-колонка: когда её использовать, а когда — нормализация (связка с ассоциативной моделью из паттерна 5).
3. Скалярный подзапрос как выражение — приём, отсутствующий в проекте.

### Куда положить

- `model_order_product.py`, миграция, демо-роут с фильтром по `items_count`.
- Приоритет: **низкий**.

---

## Сводка по файлу

| Идея | Дополняет паттерн из 07 | Приоритет | Новые файлы |
|---|---|---|---|
| DB-1 Repository на Protocol | 11 (CRUD-слой) | высокий | `example_sql/repositories/` |
| DB-2 Upsert on_conflict | 6 (ORM vs Core INSERT) | средний | `ex_order_product/crud/crud_association.py` |
| DB-3 Мягкое удаление | 2 (Annotated-типы колонок) | средний | правки `type_for_models.py`, миграция |
| DB-4 Оптимистичная блокировка | 6 (первый UPDATE в проекте) | средний | `model_order_product.py`, `PATCH /products/{id}` |
| DB-5 Bulk-операции | 6 (массовый вариант) | низкий | роут `/insert_orders_bulk` |
| DB-6 CRUD для ex_order_product | 11 («плохой» домен) | высокий | `ex_order_product/crud/` |
| DB-7 JSON + hybrid_property | 5, 6 | низкий | `model_order_product.py` |

**Рекомендуемый порядок внедрения:** DB-6 → DB-1 → DB-2 → DB-3 → DB-4 → DB-5 → DB-7.
