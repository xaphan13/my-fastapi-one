# 04 — Оценка качества кодовой базы

> Документ содержит оценку читаемости, модульности, соответствия стандартам,
> технический долг, code smells, узкие места и оценку безопасности.

---

## 1. Общая оценка читаемости, модульности и связности

### 1.1. Читаемость — ★★★★☆ (4/5)

**Положительные аспекты:**
- Единый стиль форматирования (`black`, line-length=120; `ruff` для линтинга).
- Подробные комментарии в коде (особенно в `api/my_routes_dep/` — каждый подход снабжён нумерованными пояснениями).
- Единый язык комментариев — русский (смешанный с английскими терминами).
- Использование `Annotated`-типов делает сигнатуры функций самодокументируемыми.
- Понятная структура имён: `router_*`, `model_*`, `schema_*`, `crud_*`.

**Проблемы:**
- Избыточное логирование в роутерах (по 2-3 вызова `logF.info` в каждом handler-е с дублирующейся информацией).
- В `my_param_fast_cls.py` (строки 63-67) — баг в f-string: литерал `{request.client}` не интерполируется, используется `.format(request=request)` с синтаксисом, который не соответствует шаблону.
- Имена переменных в `router_order_one.py` избыточно детализированы (`await_result_execute`, `result_scalars_all`) — это затрудняет чтение.

### 1.2. Модульность — ★★★★☆ (4/5)

**Положительные аспекты:**
- Чёткое разделение на пакеты: `core/` (конфигурация), `db_core/` (БД), `api/` (роутеры), `example_sql/` и `ex_order_product/` (бизнес-модули), `utils/` (утилиты).
- Каждый бизнес-модуль содержит собственные `models/`, `schemas/`, `crud/`, `router_*`.
- Переиспользуемые типы вынесены в `db_core/type_for_models.py` и `api/my_routes_dep/pydantic_validator.py`.
- `__init__.py` файлы выполняют роль фасадов (реэкспорт ключевых объектов).

**Проблемы:**
- Модуль `ex_order_product` **не имеет** слоя CRUD — SQL-запросы пишутся прямо в роутере (`router_order_one.py`). Это нарушает консистентность с модулем `example_sql`.
- `db_core/__init__.py` импортирует ORM-модели из `example_sql` и `ex_order_product`, создавая **циклическую зависимость** между инфраструктурным слоем (`db_core`) и бизнес-слоем.

### 1.3. Связность (Cohesion) и зацепление (Coupling) — ★★★☆☆ (3/5)

- **Высокое зацепление** между `db_core` и бизнес-модулями через `db_core/__init__.py` (реэкспорт моделей).
- **Глобальные синглтоны** (`settings`, `db_manager`, `logF`) создаются при импорте — это делает модули трудно тестируемыми (нельзя подменить конфигурацию или БД без мока на уровне модуля).
- Роутеры жёстко зависят от `CurrentSession` — тип-алиас скрывает зависимость, что удобно, но затрудняет понимание графа зависимостей.

---

## 2. Соответствие стандартам SOLID, DRY, KISS и идиомам Python

### 2.1. SOLID

| Принцип | Оценка | Комментарий |
|---|---|---|
| **S** — Single Responsibility | ★★★☆☆ | Роутеры `router_order_one.py` нарушают: содержат и роутинг, и SQL-запросы, и бизнес-логику. Роутеры `my_routes_dep/` — чистые. |
| **O** — Open/Closed | ★★★★☆ | Добавление новых роутеров через `include_router` не требует изменения существующего кода. Новые модели добавляются через наследование от `Base`. |
| **L** — Liskov Substitution | ★★★★☆ | `IntIdPkMixin` корректно расширяет `Base`. Pydantic-модели (`UserResp extends UserCreate`) — корректно. |
| **I** — Interface Segregation | ★★★☆☆ | Нет формальных интерфейсов (Python). `BaseGreat` / `GreatHelper` / `GreatService` — минимальный пример, но `BaseGreat` не является абстрактным. |
| **D** — Dependency Inversion | ★★★☆☆ | Роутеры зависят от абстракции `CurrentSession` (хорошо), но `db_manager` — конкретный класс, создаваемый глобально (плохо для тестирования). |

### 2.2. DRY (Don't Repeat Yourself)

| Участок | Нарушение | Степень |
|---|---|---|
| `my_param_*.py` (4 файла) | Четыре роутера с **идентичной** логикой handler-а (логирование, модификация Response, return-словарь). Различается только способ извлечения параметров. | Среднее — это сознательная демонстрация, но код можно сократить через общий декоратор или базовый handler. |
| `pydantic_schema.py` vs `pydantic_validator.py` | Две пары response-моделей (`RespFieldStyle`/`RespAnnotated` и `RespAfterValid`/`RespDecorValid`) с одинаковыми полями — различается только способ валидации. | Низкое — демонстрационный код. |
| Модификация Response (4 handler-а) | Одинаковый блок: `response.headers["X-Custom-Header"] = ...`, `response.set_cookie(...)` × 2. | Низкое. |

### 2.3. KISS (Keep It Simple, Stupid)

| Участок | Комментарий |
|---|---|
| `config_log.py` | Избыточно сложная конфигурация логирования: 6 форматов, 2 хендлера, 3 логгера — но в коде используется только `logF` ("OnlyFile"). Форматы `form1`, `form3`, `form4`, `con1` не используются. |
| `schema_order_product.py` | 12 классов-схем, многие из которых не используются ни в одном роутере (`ProductRespWithOrders`, `ProductRespWithsAssoc`, `ProductRespWithOrdersAssoc`, `OrderRespWithAssoc`, `OrderRespWithProductsAssoc`, `OrderRespWithProductsDetails`). |
| `router_order_one.py → get_all_join` | Ветвление `variant == 1 / else` с аннотациями типов и отладочным кодом, который обращается к `result_scalars_all[0]` и `[1]` — **упадёт** при пустом результате или одном заказе. |

### 2.4. Идиомы Python

| Аспект | Оценка | Детали |
|---|---|---|
| Type hints | ★★★★★ | Полная аннотация типов, `Annotated`, `Mapped[]`, PEP 604 (`X \| Y`). |
| Async/await | ★★★★★ | Все I/O-операции асинхронные. |
| Pathlib | ★★★★☆ | Используется `pathlib.Path` для путей, но `os.path.exists` / `os.mkdir` вместо `Path.exists()` / `Path.mkdir()`. |
| `from __future__ import annotations` | ★★★★☆ | Используется в моделях, но не везде. |
| Comprehensions | ★★★★★ | `filter_where = {k: v for k, v in ... if v is not None}` — идиоматично. |
| `model_dump()` | ★★★★★ | Pydantic v2 API используется корректно. |

---

## 3. Технический долг, code smells и узкие места

### 3.1. Технический долг

| ID | Описание | Файл | Приоритет |
|---|---|---|---|
| TD-1 | **Отсутствие слоя CRUD в `ex_order_product`** — SQL-запросы в роутере | `ex_order_product/router_order_one.py` | Высокий |
| TD-2 | **Циклическая зависимость** `db_core/__init__.py` ↔ бизнес-модели | `db_core/__init__.py` | Высокий |
| TD-3 | **Хардкод секретного токена** `"qwerty-abc"` в роутере | `api/dependencies/dep_examp_cls.py:96` | Средний |
| TD-4 | **Хардкод токена** `"foo-bar-fizz-buzz"` в `access_required` | `api/dependencies/cls_deps.py:92` | Средний |
| TD-5 | **Пароли в открытом виде** — поле `password` хранится как plain text в БД | `example_sql/models/model_user_post.py:37`, `example_sql/schemas/schema_user.py:12` | Высокий |
| TD-6 | **Устаревший стиль Pydantic v1** — `class Config: from_attributes = True` вместо `model_config = ConfigDict(...)` | `ex_order_product/schema_order_product.py:71-72` | Средний |
| TD-7 | **`Optional` / `List` из `typing`** вместо `X | None` / `list[X]` (PEP 604) | `ex_order_product/schema_order_product.py` | Низкий |
| TD-8 | **Мёртвый код** — неиспользуемые схемы (6 классов), неиспользуемые форматы логов (4), закомментированные блоки uvicorn-логгеров | `schema_order_product.py`, `config_log.py` | Низкий |
| TD-9 | **`model_user_mix.py` / `model_id_pk_mixin.py`** — `TestUser` не используется ни в роутерах, ни в миграциях | `example_sql/models/` | Низкий |
| TD-10 | **Makefile**: цели `up` и `down` перепутаны местами (`up` делает `build`, `down` делает `up`) | `Makefile:17-21` | Средний |

### 3.2. Code Smells

| Smell | Где | Описание |
|---|---|---|
| **Shotgun Surgery** | `main.py` | Добавление нового модуля требует правки `main.py` (include_router) + `api/__init__.py` + создания пакета. Нет авто-регистрации. |
| **Long Parameter List** | `my_param_*.py` | 6 параметров в каждом handler-е (path, query, header, cookie, request, response). |
| **Data Class** | `helper.py` → `BaseGreat` | Класс без поведения, только данные (`as_dict` — единственный метод). |
| **Dead Code** | `schema_order_product.py` | 6 из 12 response-схем не используются. |
| **Commented-out Code** | `config_log.py:104-119`, `router_order_one.py:64,83,92-93`, `cls_deps.py:83,97` | Закомментированный код без объяснения. |
| **Magic Numbers** | `router_order_one.py:130` | `variant: int = 1` — что значит 1? Нет Enum. |
| **Inconsistent Error Codes** | `router_order_one.py` | `409 CONFLICT` для "not found" вместо `404`. |
| **Mutable Default** | `schema_order_product.py:33` | `order_by_list: List[...] = ["id"]` — изменяемый дефолт в Pydantic (безопасно, но антипаттерн). |

### 3.3. Узкие места (Bottlenecks)

| Участок | Проблема | Влияние |
|---|---|---|
| `get_all_users` | `select(User).order_by(User.id)` без пагинации — загружает **все** записи | OOM при росте таблицы |
| `get_all_orders` | `select(Order).order_by(...)` без пагинации — аналогично | OOM при росте |
| `get_all_join` | `joinedload(Order.products)` без пагинации + `.unique().scalars().all()` — загружает все заказы со всеми продуктами | OOM + N+1 mitigated, но full table scan |
| `pool_size=50` | Пул соединений по умолчанию — 50 соединений, max_overflow=10 | Избыточно для dev; может исчерпать соединения PostgreSQL при множестве воркеров gunicorn |
| `get_async_session` | `expire_on_commit=False` — объекты остаются "живыми" после commit, но не обновляются | Может вернуть устаревшие данные при конкурентных записях |
| `ConfigLogger` | Вызывается при **каждом** импорте `config_log` — `setting_path_logger` выполняется на уровне модуля | Глобальный side-effect при импорте |

---

## 4. Оценка безопасности и надёжности

### 4.1. Безопасность

| Категория | Оценка | Детали |
|---|---|---|
| **Аутентификация** | ★☆☆☆☆ | Нет аутентификации. `HeaderAccessDependency` — демонстрационная заглушка с хардкод-токеном. Все CRUD-роутеры (`/users`, `/orders`) **полностью открыты**. |
| **Авторизация** | ★☆☆☆☆ | Отсутствует. Нет проверки прав доступа. |
| **Хранение паролей** | ★☆☆☆☆ | Пароли хранятся в БД в **открытом виде**. Поле `password: Mapped[str_len_50 \| None]`. Нет хеширования (bcrypt/argon2). |
| **CORS** | ★☆☆☆☆ | Не настроен. `CORSMiddleware` отсутствует. При prod-деплое браузерные клиенты не смогут обращаться к API. |
| **SQL Injection** | ★★★★★ | Используется ORM SQLAlchemy с параметризованными запросами. `filter_by(**dict)` и `where(*list)` — безопасны. |
| **Валидация входных данных** | ★★★★☆ | Pydantic-валидация на всех роутах. `model_dump(exclude_none=True)` корректно фильтрует None. Однако `ProductUpdateBody.price: int \| str = ""` — странный тип, допускающий строку. |
| **Secrets в репозитории** | ★★☆☆☆ | `docker-compose.yml` содержит `POSTGRES_PASSWORD: password`. `one.env` содержит URL с паролем. Файлы не в `.gitignore` (проверить). |
| **HTTPS/TLS** | ★★☆☆☆ | Nginx-конфигурация объявлена, но не интегрирована с приложением напрямую. Dev-запуск — HTTP. |

### 4.2. Надёжность

| Категория | Оценка | Детали |
|---|---|---|
| **Обработка ошибок БД** | ★★☆☆☆ | `rollback` есть в `get_async_session`, но нет кастомных exception handlers. `IntegrityError` → непонятный 500. |
| **Idempotent operations** | ★★★☆☆ | `POST /insert_order` — неидемпотентный (каждый вызов создаёт новый заказ). Нет дедупликации. |
| **Graceful shutdown** | ★★★★☆ | `lifespan` корректно вызывает `engine_dispose()`. Gunicorn `timeout=900` — долго, но безопасно. |
| **Reconnection** | ★★☆☆☆ | Нет логики обработки разрыва соединения с БД. `asyncpg` имеет встроенный pool-recycling, но `pool_recycle` не настроен. |
| **Health checks** | ★☆☆☆☆ | Нет `/health` или `/readiness` эндпоинта. |
| **Rate limiting** | ★☆☆☆☆ | Отсутствует. |
| **Тесты** | ★☆☆☆☆ | **Полностью отсутствуют.** Нет ни unit-тестов, ни integration-тестов, ни фикстур. |

### 4.3. Утечки ресурсов

| Риск | Файл | Описание |
|---|---|---|
| **Открытый курсор в SQLite** | `db_core/db_async.py:41-44` | `cursor.close()` вызывается, но при исключении в `cursor.execute` курсор не закрывается (нет `try/finally`). |
| **Лог-файлы** | `config_log.py` | `RotatingFileHandler` с `backupCount=20` × `maxBytes=1MB` = максимум 20 MB. Не является утечкой, но нет архивации/компрессии. |
| **Файловый дескриптор БД** | `db_async.py` | `engine_dispose()` вызывается только в `lifespan` shutdown. При аварийном завершении процесса (SIGKILL) соединения остаются открытыми до таймаута БД. |

---

## 5. Сводная оценка

| Категория | Оценка | Краткое резюме |
|---|---|---|
| Читаемость | ★★★★☆ | Хороший стиль, избыточное логирование |
| Модульность | ★★★★☆ | Чёткая структура, нарушение в `ex_order_product` |
| Связность/Зацепление | ★★★☆☆ | Глобальные синглтоны, циклическая зависимость |
| SOLID | ★★★☆☆ | SRP нарушен в роутерах orders, DI нарушен глобальными синглтонами |
| DRY | ★★★☆☆ | Демонстрационное дублирование, мёртвый код |
| KISS | ★★★☆☆ | Избыточная конфигурация логов, мёртвые схемы |
| Безопасность | ★★☆☆☆ | Нет auth, пароли в открытом виде, нет CORS |
| Надёжность | ★★☆☆☆ | Нет тестов, health-checks, exception handlers |
| **Итого** | **★★★☆☆ (3/5)** | Сильная учебная база, требует продакшн-доработки |
