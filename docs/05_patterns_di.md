# 05. Чему учит проект: паттерны внедрения зависимостей (DI)

> Часть 5 из 7. См. также: [06_patterns_parameters.md](06_patterns_parameters.md), [07_patterns_data_layer.md](07_patterns_data_layer.md).
> Предыдущие части: [01](01_project_structure.md)–[04](04_code_quality.md).

Этот и следующие два файла — **обучающие**. В отличие от карты проекта (01), архитектуры (02) и оценки качества (04), здесь мы берём **конкретные куски кода** и разбираем: какую задачу решает, какие шаги внутри, почему это правильно (или не совсем), и что из этого стоит переносить в реальный проект.

---

## Введение: что вообще учит этот проект

Главная учебная идея `my-fastapi-one` — **показать один и тот же результат несколькими способами и дать сравнить их построчно**. Это не продуктовый сервис, а «каталог приёмов». Четыре учебных блока:

| Блок | Что учит | Файлы |
|---|---|---|
| Внедрение зависимостей | 9 способов `Depends` | `api/dependencies/` |
| Извлечение параметров | 4 стиля одного эндпоинта `/my_items/{item_id}` | `api/my_routes_dep/` |
| Валидация pydantic | `Field`/`Annotated`, `AfterValidator`/`field_validator` | `api/my_routes_dep/` |
| Асинхронный слой данных | SQLAlchemy 2.0 async, отношения, миграции | `ex_user_post/`, `ex_order_product/`, `db_core/` |

Дальше — по каждому приёму с кодом.

---

## Паттерн 1. Алиас сессии БД через `Annotated` (ресурсный DI)

### Куски кода

`db_core/db_async.py`:

```python
class AsyncDbManager:
    def __init__(self, url, echo=False, pool_size=5, max_overflow=10):
        self.engine = create_async_engine(url=url, echo=echo, pool_size=pool_size, max_overflow=max_overflow)
        self.session_factory = async_sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )

    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self.session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise


db_manager = AsyncDbManager(url=str(settings.db.url), ...)

CurrentSession = Annotated[AsyncSession, Depends(db_manager.get_async_session)]
```

А в обработчике (`ex_user_post/router_users.py`):

```python
@r_users_sql.get("/get_all_users", response_model=list[UserResp])
async def get_users(session: CurrentSession):
    users = await users_crud.get_all_users(session=session)
    return users
```

### Какую задачу решает

Каждому обработчику, который работает с БД, нужна `AsyncSession`. Наивно было бы в каждом роуте писать:

```python
async def get_users():
    async with db_manager.session_factory() as session:
        ...
```

Это дублировало бы фабрику сессий и логику закрытия/отката в десятке мест. Паттерн DI переносит «как получить сессию» в одно место — зависимость `get_async_session`, — а обработчик лишь объявляет, **что** ему нужно (`session: CurrentSession`), не зная **как** оно создаётся.

### Почему это правильно

1. **Single source of truth.** Единственное место, где известно про движок и фабрику сессий — `AsyncDbManager`. Обработчики не зависят от конкретной фабрики, а только от абстракции `AsyncSession`.
2. **Teardown в одном месте.** Генератор — это ключ к паттерну: `yield` отдаёт сессию, а код после `yield` (выход из `async with`) выполнится **после** завершения обработчика. Закрытие сессии происходит автоматически, его невозможно забыть.
3. **Rollback контракт.** `try/except` вокруг `yield` гарантирует: при любом исключении транзакция откатывается, а не «зависает» незакрытой.
4. **`Annotated`-алиас** (`CurrentSession`) сокращает сигнатуры: вместо `session: Annotated[AsyncSession, Depends(...)]` пишется `session: CurrentSession`. Это и читаемость, и DRY.

### Почему «не совсем» (нюансы, которые стоит знать)

- **Контракт «откатывает, но не коммитит».** Зависимость сама не вызывает `commit()`. Если обработчик забудет `await session.commit()`, изменения тихо потеряются — никакой ошибки не будет. Это осознанный дизайн (коммит — ответственность бизнес-логики), но он требует дисциплины.
- **`db_manager` создаётся на импорте модуля** (синглтон через модульный уровень). Это значит: создание движка SQLAlchemy — побочный эффект импорта. Для тестов это неудобно (см. 04).
- **Пул создаётся до форка gunicorn** — при `workers > 1` соединения `asyncpg` не переживают `fork()` корректно (см. 04, «Узкие места»).

---

## Паттерн 2. Dependency Factory (замыкание) — параметризованная зависимость

### Куски кода

`api/dependencies/func_deps.py`:

```python
def get_header_dependency(header_name: str, default_value: str = ""):
    def dependency(
        header: Annotated[str, Header(alias=header_name)] = default_value,
    ) -> str:
        return header
    return dependency
```

Использование в роуте (`dep_examp_simple.py`):

```python
@router_dep_simple.get("/multi-indirect")
def multi_indirect_dependencies(
    foobar: Annotated[str, Depends(get_header_dependency("x-foobar"))],
    fizzbuzz: Annotated[str, Depends(get_header_dependency("x-fizz-buzz", default_value="FizzBuzz"))],
):
    return {"x-foobar": foobar, "x-fizz-buzz": fizzbuzz}
```

### Какую задачу решает

Без этой фабрики для чтения каждого заголовка пришлось бы писать отдельную функцию:

```python
def get_x_foo_bar(foobar: Annotated[str, Header(alias="x-foo-bar")] = "") -> str:
    return foobar
```

В проекте такая функция есть (`get_x_foo_bar`) — и сразу видно её слабость: она жёстко зашита на один заголовок `x-foo-bar`. Чтобы читать `x-fizz-buzz`, нужна ещё одна почти такая же функция. Фабрика `get_header_dependency(name)` решает это: она **возвращает новую функцию-зависимость**, параметризованную именем заголовка.

### Почему это правильно

- **Устранение дублирования.** Одна функция-фабрика заменяет N почти одинаковых функций-зависимостей.
- **Параметр известен на этапе сборки сигнатуры.** Это принципиальный момент: FastAPI читает аннотации и default-значения **в момент объявления** функции, а не в рантайме. Поэтому имя заголовка должно быть «вшито» в сигнатуру до вызова — замыкание решает это ровно тем способом, который допускает FastAPI.
- **Переиспользуемость.** По данным графа вызовов это самая переиспользуемая зависимость в проекте — максимальный fan-in среди прикладных функций.

### Почему «не совсем»

- Замыкание чуть менее читаемо, чем явная функция: чтобы понять, что делает `get_header_dependency("x-foobar")`, нужно заглянуть в фабрику. Для однократно используемого заголовка проще и нагляднее явная функция, как `get_x_foo_bar`.

---

## Паттерн 3. Класс как зависимость (три варианта)

Проект показывает **три** способа сделать класс зависимостью. Это очень полезный учебный блок, потому что в реальных проектах все три встречаются.

### Вариант A: класс с параметрами в `__init__`

`api/dependencies/helper.py`:

```python
class GreatService(BaseGreat):
    def __init__(
        self,
        name: Annotated[str, Header(alias="x-great-service-name")],
        default: Annotated[str, Header(alias="x-great-service-default-value")],
    ) -> None:
        self.name = name
        self.default = default
```

Использование (`dep_examp_cls.py`):

```python
@router_dep_cls.get("/great-service-as-dependency")
def get_great_service_dependency(
    service: Annotated[GreatService, Depends(GreatService)],
):
    return {"service": service.as_dict(), ...}
```

**Какую задачу решает:** `GreatService` объявляет свои зависимости (заголовки) прямо в `__init__`. FastAPI видит `Depends(GreatService)`, смотрит на аннотации `__init__`, извлекает заголовки и создаёт экземпляр. Обработчик получает готовый объект.

**Почему правильно:** минимум кода — класс сам описывает, что ему нужно; ничего дополнительно писать не надо.

**Почему «не совсем»:** класс жёстко привязан к конкретному источнику данных (заголовкам). Тот же `GreatHelper` (ниже) — с обычным `__init__(name, default)` — не может быть зависимостью напрямую, потому что у него нет аннотаций FastAPI. Требуется фабрика `get_great_helper` (`func_deps.py`), которая собирает `GreatHelper` из двух заголовков через `Depends`. Это иллюстрирует компромисс: «класс-зависимость» удобен, но связывает класс с HTTP-контекстом.

### Вариант B: экземпляр с `__call__`

`api/dependencies/cls_deps.py`:

```python
class HeaderAccessDependency:
    def __init__(self, secret_token: str) -> None:
        self.secret_token = secret_token

    def __call__(self, token: Annotated[str, Header(alias="x-access-token")]) -> TokenIntrospectResult:
        return self.validate(token=token)
```

Использование:

```python
Depends(HeaderAccessDependency(secret_token="qwerty-abc"))
```

**Какую задачу решает:** объект создаётся **один раз** с конфигурацией (`secret_token`), а на каждый запрос FastAPI вызывает `__call__`. Это способ «проинъектить конфигурацию в момент создания, а per-request данные получить при вызове».

**Почему правильно:** конфигурация (`secret_token`) отделена от per-request логики. Создание экземпляра с токеном наглядно, `__call__` читается как «что делать с каждым запросом».

**Почему «не совсем»:** (см. подробнее в 06/04) сравнение токена через `!=` уязвимо к timing-атаке — корректно `secrets.compare_digest`. Токен захардкожен в коде. Для демо ок, для прода — нет.

### Вариант C: метод-генератор экземпляра

`api/dependencies/cls_deps.py`:

```python
class PathReaderDependency:
    def __init__(self, source: str) -> None:
        self.source = source
        self._request: Request | None = None
        self._foobar: str = ""

    def as_dependency(self, request: Request,
                      foobar: Annotated[str, Header(alias="x-foobar")] = "foo",
                      ) -> Generator[Self, None, None]:
        self._request = request
        self._foobar = foobar
        yield self
        self._request = None
```

Использование:

```python
Depends(PathReaderDependency(source="direct/bar").as_dependency)
```

**Какую задачу решает:** конфигурация (`source`) фиксируется при создании экземпляра (`PathReaderDependency(source="direct/bar")`), а per-request данные (`request`, заголовок) приходят через сигнатуру метода-генератора. `yield self` отдаёт объект обработчику, а код после `yield` — это teardown (обнуление `_request`). **Это единственное место в проекте, где показан teardown зависимости.**

**Почему правильно:** сочетает оба преимущества — настройка вне HTTP и per-request данные + явная точка очистки. Паттерн генератора в DI идеален для «инициализация → работа → очистка».

**Почему «не совсем»:** в классе есть скрытая ловушка — закомментированный модульный синглтон `path_reader = PathReaderDependency(...)` (строка 48) и закомментированная альтернатива `Depends(path_reader.as_dependency)`. Если бы её раскомментировали, один экземпляр делился бы между запросами, и конкурентные запросы перезаписывали бы `_request` друг друга — гонка. Сейчас в роуте создаётся **новый** экземпляр на каждый вызов, поэтому гонки нет. Это хороший пример «почему не стоит делать объект-зависимость модульным синглтоном, если он хранит per-request состояние».

---

## Паттерн 4. Инъекция через `Depends(GreatHelper)` (составная зависимость)

### Куски кода

`api/dependencies/func_deps.py`:

```python
def get_great_helper(
    helper_name: Annotated[str, Depends(get_header_dependency("x-helper-name"))],
    helper_default: Annotated[str, Depends(get_header_dependency("x-helper-default-value"))],
) -> GreatHelper:
    return GreatHelper(name=helper_name, default=helper_default)
```

Использование:

```python
@router_dep_cls.get("/helper-as-dependency")
def helper_as_dependency(
    helper: Annotated[GreatHelper, Depends(get_great_helper)],
):
    return {"helper": helper.as_dict(), ...}
```

### Какую задачу решает

`GreatHelper.__init__(name, default)` — обычный класс без аннотаций FastAPI, поэтому напрямую `Depends(GreatHelper)` не сработает. Чтобы собрать его из HTTP-заголовков, нужна фабрика-функция `get_great_helper`, которая сама зависит от двух параметризованных зависимостей и возвращает готовый объект.

### Почему это правильно

Показана **композиция зависимостей**: зависимость сама может зависеть от других зависимостей. FastAPI решает граф зависимостей, кэширует результат в рамках одного запроса (по умолчанию `use_cache=True`) и передаёт в обработчик готовый объект. Это основа построения «сервисных» слоёв через DI.

### Почему «не совсем»

Здесь же хорошо видно **альтернативу** — `GreatService`, который сам объявляет заголовки в `__init__` (вариант A из паттерна 3). Два подхода решают одну задачу. Выбор между ними — это выбор между «класс знает о HTTP» (меньше кода) и «класс чистый, его собирает фабрика» (больше кода, но класс переиспользуем вне HTTP). Проект намеренно показывает оба, чтобы было что сравнить.

---

## Итог по DI

| Паттерн | Что учит | Оценка |
|---|---|---|
| Алиас `CurrentSession` | Ресурсный DI + генератор-teardown + rollback | ✅ правильно |
| Dependency Factory (замыкание) | Параметризация имени заголовка | ✅ правильно |
| Класс с `__init__`-аннотациями | Минимум кода, но связь с HTTP | ⚠️ компромисс |
| Экземпляр с `__call__` | Конфигурация + per-request | ✅, но токен через `!=` — ❌ |
| Метод-генератор | Teardown зависимости | ✅ правильно |
| Фабрика-функция | Композиция зависимостей | ✅ правильно |

**Главный вывод блока:** внедрение зависимостей в FastAPI — это не один приём, а спектр. Для «ресурса» (сессия БД) — генератор с teardown; для «переиспользуемого правила» (чтение заголовка) — фабрика-замыкание; для «сервиса» — класс/фабрика. Выбор зависит от того, что вы инъектируете и нужна ли вам очистка после запроса.
