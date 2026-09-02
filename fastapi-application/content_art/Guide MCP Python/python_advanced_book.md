# Python для продвинутых: От мидла к архитектору
## Структура учебника с примерами кода

---

## ЧАСТЬ I: МАГИЯ ОБЪЕКТНОЙ МОДЕЛИ PYTHON

### Глава 1: Протокол дескрипторов — основа магии Python
**Проблема:** Большинство книг упоминают дескрипторы поверхностно, не объясняя, как на них построены property, classmethod, staticmethod

**Темы:**
- Как работает `__get__`, `__set__`, `__delete__`
- Разница между data и non-data дескрипторами
- Порядок поиска атрибутов (attribute lookup chain)
- Реализация собственных property, validators, lazy attributes
- Кейс: ORM-like система с дескрипторами
- Кейс: Cached property с инвалидацией
- Типичные ошибки: почему дескрипторы не работают на уровне экземпляра

**Практика:** Написание SQLAlchemy-подобной системы маппинга

---

### Глава 2: Метаклассы — когда и зачем
**Проблема:** Метаклассы представляют как "продвинутую магию", но не показывают реальные use cases

**Темы:**
- `__new__` vs `__init__` в метаклассах
- `__init_subclass__` как альтернатива метаклассам (PEP 487)
- `__set_name__` для автоматической конфигурации дескрипторов
- Конфликты метаклассов и их разрешение
- Реальные паттерны: Registry, Singleton, Validation, ORM
- Анти-паттерны: когда метакласс — это overengineering
- Интроспекция: `type()`, `__mro__`, `__bases__`

**Практика:** Создание фреймворка для автоматической регистрации плагинов

---

### Глава 3: Magic methods глубже
**Проблема:** Многие знают `__init__`, но не понимают тонкости других протоколов

**Темы:**
- Полный протокол сравнения и `functools.total_ordering`
- Контекстные менеджеры: `__enter__`/`__exit__` vs `contextlib`
- Протокол итератора vs итерируемого объекта
- `__getattr__`, `__getattribute__`, `__setattr__` — различия и ловушки
- `__missing__` для словарей
- `__init_subclass__` и кастомизация наследования
- Callable objects: `__call__`
- Неявные преобразования: `__bool__`, `__len__`, `__index__`

**Практика:** Fluent API builder с method chaining

---

## ЧАСТЬ II: ФУНКЦИОНАЛЬНОЕ ПРОГРАММИРОВАНИЕ В PYTHON

### Глава 4: Функции высшего порядка и замыкания
**Проблема:** Closure scope и LEGB правило объясняют плохо, особенно `nonlocal`

**Темы:**
- LEGB resolution: Local, Enclosing, Global, Built-in
- Замыкания и их внутреннее устройство (`__closure__`, `cell_contents`)
- `nonlocal` vs `global` — когда и почему
- Фабрики функций и частичное применение
- `functools.partial` и `functools.partialmethod`
- Мемоизация: `@lru_cache`, кастомные декораторы
- Композиция функций

**Практика:** Система middleware для веб-фреймворка

---

### Глава 5: Декораторы — от простых к сложным
**Проблема:** Декораторы с аргументами и сохранение метаданных объясняют плохо

**Темы:**
- Декораторы функций: с аргументами и без
- `functools.wraps` — зачем и как работает
- Декораторы классов
- Stacked decorators: порядок применения
- Параметризованные декораторы
- Декораторы с состоянием (stateful decorators)
- Debugging декорированных функций
- Property decorators: getter, setter, deleter

**Практика:** Retry decorator с exponential backoff, rate limiting decorator

---

### Глава 6: Генераторы и корутины
**Проблема:** Путаница между generator functions, generator expressions и coroutines

**Темы:**
- Generator protocol: `__iter__`, `__next__`
- `yield`, `yield from` — разница и применение
- Отправка данных в генератор: `.send()`, `.throw()`, `.close()`
- Generator expressions vs list comprehensions
- Delegation с `yield from`
- Старые корутины на генераторах vs новые async/await
- Пайплайны обработки данных

**Практика:** ETL pipeline с ленивыми вычислениями

---

## ЧАСТЬ III: КОНКУРЕНТНОСТЬ И ПАРАЛЛЕЛИЗМ

### Глава 7: GIL — понимание и обход ограничений
**Проблема:** GIL объясняют поверхностно, без практических решений

**Темы:**
- Что такое GIL и почему он существует
- Reference counting и memory management в CPython
- CPU-bound vs I/O-bound задачи
- Когда threading работает, когда нет
- Освобождение GIL в C-extensions
- PEP 703: Free-threading Python (nogil build)
- Измерение влияния GIL: профилирование

**Практика:** Бенчмарки различных подходов к параллелизму

---

### Глава 8: Threading — правильное использование
**Проблема:** Race conditions, deadlocks — как их избежать

**Темы:**
- `threading` модуль: Thread, Lock, RLock, Semaphore, Event
- Thread-local storage: `threading.local()`
- Atomic operations в Python
- Queue: `queue.Queue`, `queue.LifoQueue`, `queue.PriorityQueue`
- Thread pools: `concurrent.futures.ThreadPoolExecutor`
- Паттерны: Producer-Consumer, Work Queue
- Debugging многопоточного кода

**Практика:** Многопоточный web scraper с rate limiting

---

### Глава 9: Multiprocessing — истинный параллелизм
**Проблема:** Overhead, pickling, shared memory — недооценённые сложности

**Темы:**
- Process vs Thread
- `multiprocessing`: Process, Pool, Queue, Pipe
- Shared memory: `Value`, `Array`, `Manager`
- Проблемы serialization (pickle)
- `concurrent.futures.ProcessPoolExecutor`
- Межпроцессная коммуникация
- Copy-on-write и fork
- Best practices: когда использовать

**Практика:** Параллельная обработка изображений

---

### Глава 10: Asyncio — асинхронное программирование
**Проблема:** Event loop, корутины, tasks — концептуальная путаница

**Темы:**
- Event loop архитектура
- `async`/`await` синтаксис
- Корутины vs tasks vs futures
- `asyncio.gather()`, `asyncio.wait()`, `as_completed()`
- Semaphore и rate limiting
- Async context managers и iterators
- `asyncio.create_task()` vs `ensure_future()`
- Интеграция с синхронным кодом
- Типичные ошибки: blocking calls в async

**Практика:** Асинхронный HTTP клиент с connection pooling

---

### Глава 11: Продвинутый asyncio
**Проблема:** Backpressure, error handling, cancellation — сложные сценарии

**Темы:**
- Cancellation и timeouts
- Exception handling в async коде
- Backpressure и flow control
- Async generators и async comprehensions
- `asyncio.StreamReader`/`StreamWriter`
- Интеграция с другими event loops (uvloop)
- Профилирование async кода
- Паттерны: Circuit Breaker, Retry, Fallback

**Практика:** Высоконагруженный API клиент с retry логикой

---

## ЧАСТЬ IV: ПАМЯТЬ И ПРОИЗВОДИТЕЛЬНОСТЬ

### Глава 12: Memory management internals
**Проблема:** Утечки памяти, reference cycles — как находить и исправлять

**Темы:**
- Reference counting механизм
- Garbage collector: поколения, пороги
- `gc` модуль: `collect()`, `get_objects()`, `get_referrers()`
- Weak references: `weakref` модуль
- `__del__` и проблемы с finalizers
- Reference cycles и как их избегать
- Memory leaks: обнаружение с `tracemalloc`
- `__slots__` для экономии памяти
- Memory-mapped files: `mmap`

**Практика:** Отладка memory leak в production приложении

---

### Глава 13: Профилирование и оптимизация
**Проблема:** Преждевременная оптимизация vs обоснованная

**Темы:**
- Профилирование: `cProfile`, `line_profiler`, `memory_profiler`
- `timeit` для микробенчмарков
- `py-spy` для production профилирования
- Flame graphs и визуализация
- Big O notation для Python структур данных
- Оптимизация: где искать bottleneck'и
- JIT compilation: PyPy, Numba
- Cython для критичных участков

**Практика:** Оптимизация slow endpoint в API

---

### Глава 14: Структуры данных — выбор правильной
**Проблема:** Неправильный выбор структуры данных = медленный код

**Темы:**
- Time complexity: dict, set, list, deque
- `collections`: `defaultdict`, `Counter`, `OrderedDict`, `ChainMap`
- `heapq` для priority queues
- `bisect` для sorted sequences
- `array.array` vs `list`
- Memory footprint различных структур
- Immutable collections: `frozenset`, `tuple`
- Когда использовать numpy arrays
- Trade-offs: memory vs speed

**Практика:** Реализация LRU cache с минимальной памятью

---

## ЧАСТЬ V: АРХИТЕКТУРНЫЕ ПАТТЕРНЫ

### Глава 15: Dependency Injection в Python
**Проблема:** DI в Python делают редко и неправильно

**Темы:**
- Почему DI важен
- Constructor injection vs setter injection
- DI containers: обзор библиотек (dependency-injector, etc)
- Protocol (structural subtyping) вместо ABC
- Инверсия зависимостей
- Тестируемость кода
- FastAPI зависимости как пример

**Практика:** Рефакторинг legacy кода с внедрением DI

---

### Глава 16: Паттерны проектирования — Python way
**Проблема:** GoF паттерны объясняют на Java, а не на Python

**Темы:**
- Creational: Singleton (и почему его избегать), Factory, Builder
- Structural: Adapter, Decorator (vs декораторы), Proxy
- Behavioral: Strategy, Observer, Command, Iterator
- Pythonic альтернативы классическим паттернам
- First-class functions вместо Strategy
- Context managers вместо некоторых паттернов
- Dataclasses и паттерны

**Практика:** Refactoring кода с применением паттернов

---

### Глава 17: Type hints и static analysis
**Проблема:** Type hints есть, но используют неправильно или не полностью

**Темы:**
- Основы: `int`, `str`, `List`, `Dict`, `Optional`
- Generic types: `TypeVar`, `Generic`
- Protocols (PEP 544) — structural typing
- `Union`, `Literal`, `TypedDict`
- `Callable`, `ParamSpec`, `Concatenate`
- `mypy` конфигурация и использование
- Type narrowing и type guards
- `@overload` для перегрузки
- Runtime type checking: `pydantic`, `typeguard`

**Практика:** Типизация сложного API клиента

---

## ЧАСТЬ VI: ТЕСТИРОВАНИЕ И КАЧЕСТВО КОДА

### Глава 18: Advanced testing с pytest
**Проблема:** Многие застревают на unittest, не зная возможностей pytest

**Темы:**
- Fixtures: scope, parametrize, autouse
- Mocking: `unittest.mock`, `pytest-mock`
- Monkey patching правильно
- Property-based testing: `hypothesis`
- Test parametrization
- Coverage анализ: `coverage.py`, `pytest-cov`
- Integration testing
- Testing async кода
- TDD и BDD подходы

**Практика:** Test suite для REST API

---

### Глава 19: Debugging — от print к профессиональным инструментам
**Проблема:** Debugging остаётся на уровне print statements

**Темы:**
- `pdb` и `ipdb`: интерактивная отладка
- Breakpoints: `breakpoint()` (PEP 553)
- Post-mortem debugging
- Remote debugging
- Logging best practices: уровни, форматирование
- Structured logging: JSON logs
- `logging` конфигурация
- Exception handling и трейсбеки
- Sentry и error tracking

**Практика:** Отладка production bug с минимальной информацией

---

## ЧАСТЬ VII: ИНТЕГРАЦИЯ С НИЗКИМ УРОВНЕМ

### Глава 20: C extensions — когда Python слишком медленный
**Проблема:** C API выглядит страшно, но иногда необходим

**Темы:**
- Python C API basics
- PyObject и reference counting
- Создание extension module
- Cython как альтернатива
- CFFI для биндингов
- pybind11 для C++
- GIL release в C коде
- Когда стоит использовать

**Практика:** Оптимизация critical path через Cython

---

### Глава 21: Протокол Buffer и CPython internals
**Проблема:** Zero-copy операции и работа с memory views

**Темы:**
- Buffer protocol
- `memoryview` объекты
- `struct` модуль для бинарных данных
- `ctypes` для C библиотек
- Memory layout и alignment
- Zero-copy операции
- Numpy и buffer protocol

**Практика:** Эффективная работа с большими бинарными файлами

---

## ЧАСТЬ VIII: ПРОДВИНУТЫЕ ТЕМЫ

### Глава 22: Import system и packaging
**Проблема:** Import hooks, namespace packages — тёмный лес

**Темы:**
- Как работает `import`
- `sys.path` и PYTHONPATH
- Import hooks: meta path finders
- `importlib` для динамических импортов
- Namespace packages (PEP 420)
- Относительные импорты
- Circular imports — решение проблемы
- Packaging: `setup.py`, `pyproject.toml`
- Wheels и source distributions

**Практика:** Plugin system с динамической загрузкой

---

### Глава 23: Context variables и execution context
**Проблема:** Thread-local не работает с asyncio

**Темы:**
- `contextvars` модуль (PEP 567)
- `ContextVar` vs `threading.local()`
- Context propagation в async коде
- Use cases: request ID, logging context
- Performance considerations

**Практика:** Request tracing в async веб-приложении

---

### Глава 24: Reflection и introspection
**Проблема:** Метапрограммирование и runtime модификации

**Темы:**
- `inspect` модуль: сигнатуры, source code, stack
- `__dict__`, `dir()`, `vars()`
- `getattr()`, `setattr()`, `delattr()`, `hasattr()`
- `type()` и динамическое создание классов
- `@property` динамически
- Annotations и `__annotations__`
- Frame introspection
- Monkey patching: когда и как

**Практика:** Автоматическая генерация API documentation

---

## ЧАСТЬ IX: СПЕЦИФИЧНЫЕ ДОМЕНЫ

### Глава 25: Data Science оптимизации
**Проблема:** Pandas slow, numpy broadcasting непонятен

**Темы:**
- Vectorization в numpy
- Broadcasting rules
- Views vs copies в numpy
- Pandas оптимизации: `category`, `eval()`, `query()`
- Memory-efficient data loading
- `dask` для out-of-core computing
- Numba JIT для числовых вычислений

**Практика:** Оптимизация data pipeline

---

### Глава 26: Web frameworks — внутреннее устройство
**Проблема:** ASGI, WSGI, middleware — как это работает

**Темы:**
- WSGI protocol
- ASGI protocol
- Middleware layers
- Request/Response lifecycle
- Routing mechanisms
- Template engines internals
- ORM: lazy loading, N+1 problem, query optimization
- Connection pooling

**Практика:** Написание minimal ASGI framework

---

## ПРИЛОЖЕНИЯ

### Приложение A: Python 3.12+ новые возможности
- PEP 701: f-strings improvements
- PEP 695: Type Parameter Syntax
- PEP 698: `@override` decorator
- Performance improvements

### Приложение B: Чеклист для code review
- Type hints coverage
- Error handling
- Testing coverage
- Performance considerations
- Security considerations

### Приложение C: Инструменты разработки
- Linters: `pylint`, `flake8`, `ruff`
- Formatters: `black`, `isort`
- Type checkers: `mypy`, `pyright`
- Profilers и debuggers

---

## Методология книги

**Каждая глава содержит:**
1. **Проблема** — что плохо объясняют другие книги
2. **Теория** — как это работает на самом деле
3. **Код-примеры** — работающий код с объяснением
4. **Типичные ошибки** — что делают неправильно
5. **Best practices** — как делать правильно
6. **Практическое задание** — реальная задача

**Принципы:**
- Примеры из production кода, а не toy examples
- Объяснение "почему", а не только "как"
- Performance benchmarks где уместно
- Сравнение альтернативных подходов
- Debugging и troubleshooting секции

**Целевая аудитория:**
- 2+ года опыта с Python
- Знание базового синтаксиса, ООП, основ async
- Желание понимать "как работает под капотом"
- Стремление писать production-ready код
