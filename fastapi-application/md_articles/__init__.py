"""
Подключение блога `md_articles` к FastAPI как plug-in.

Что в этом пакете:
  - `__init__.py` (этот файл) — публичный API подключения: middleware
    current_user, регистрация блога, монтирование `/static` (аватары).
  - `api_blog.py` — JSON-роутер `/api/blog/*` (13 эндпоинтов) для
    React SPA: csrf, current_user, register/login/logout, account,
    sections, articles, art_manage.
  - `schema_art.py` — pydantic-модель `ArticleLang` + YAML-реестр
    статей с mtime-кэшем и атомарной записью.
  - `models.py` — SQLAlchemy-модели `BlogUser`, `BlogPost`.
  - `web_utils.py` — `get_current_user`, `login_user`/`logout_user`,
    bcrypt-хелперы `hash_password`/`verify_password`.

Чем этот файл НЕ является:
  Этот модуль — **точка входа в пакет**, а не «свалка конфигурации».
  Здесь только то, что относится к подключению блога к FastAPI
  (middleware, mount, вызов роутера). Сами роутеры, схемы статей и
  модели живут в своих файлах и подключаются отсюда явно.

Побочные эффекты на импорте:
  `from md_articles import register_md_articles` подтягивает:
    - `api_blog` (импортирует pydantic-схемы статей, `RequestValidationError`);
    - `web_utils` (bcrypt);
    - `models` (`BlogUser`, `BlogPost` — попадают в `Base.metadata`
      для Alembic, поэтому модели реэкспортированы здесь неявно через
      импорт в `db_core/__init__.py`).
  Сам по себе импорт `md_articles` не создаёт engine и не открывает
  сессий — это происходит только при первом запросе (или при явном
  вызове `register_md_articles`).

См. `docs/15_md_articles_package.md` — общий разбор пакета: контракт
plug-in, схема запросов, жизненный цикл сессии и current_user.
"""
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from base_dir_path import BASE_DIR
from config_log import logF
from core.config import settings
from db_core.db_async import db_manager
from md_articles.api_blog import (
    custom_request_validation_exception_handler,
    router_blog_api,
)
from md_articles.web_utils import get_current_user


async def inject_current_user_middleware(request: Request, call_next):
    """
    HTTP-middleware: подгружает current_user для каждого запроса.

    Что делает:
      Открывает короткую сессию БД через `db_manager.session_factory()`,
      вызывает `get_current_user(request, session)` — функция из
      `web_utils.py`, которая по `request.session['user_id']` достаёт
      `BlogUser` из БД и кладёт его в `request.state.current_user`.
      Затем передаёт управление дальше по цепочке.

    Почему middleware, а не dependency:
      `request.state.current_user` нужен **всем** обработчикам блога
      (и `/api/blog/articles`, и `/api/blog/current_user`, и сам
      exception-handler) и желательно без явной зависимости в каждом
      `@router.get(...)`. Middleware гарантирует, что к моменту
      вызова роута `request.state.current_user` либо `None`, либо
      `BlogUser`. Это убирает повторяющийся `Depends(get_current_user)`
      в каждом эндпоинте.

    Особенности:
      - Сессия открывается **на каждый запрос** и закрывается по
        выходу из `async with` — расход соединений линейный, но для
        блога с низкой нагрузкой это приемлемо. Если будет узкое
        место — переезжаем на пул сессий в `request.state`.
      - `get_current_user` ловит «сессия без user_id» (анонимный
        пользователь) и кладёт `None` в state — не нужно проверять
        в каждом роуте «а есть ли вообще ключ».
    """
    async with db_manager.session_factory() as session:
        await get_current_user(request, session)
        response = await call_next(request)
    return response


def register_md_articles(app: FastAPI) -> None:
    """
    Подключает блог к FastAPI: middleware, сессии, статика, JSON-роутер.

    Это plug-in, вызываемый из `create_app()` (см. `create_fastapi.py`).
    Делает четыре вещи — в строгом порядке, потому что порядок здесь
    важен (см. ниже):

      1. `app.middleware("http")(inject_current_user_middleware)`
         — добавляет HTTP-middleware, описанную выше. Должно быть
         добавлено **до** регистрации роутера, чтобы к моменту
         вызова любого эндпоинта блога `request.state.current_user`
         уже был заполнен.

      2. `app.add_middleware(SessionMiddleware, secret_key=..., max_age=...)`
         — сессии на основе `itsdangerous`-подписанных cookie. Без
         этой middleware `request.session` в обработчиках бросит
         `AttributeError`. `secret_key` берётся из `settings.web`,
         `max_age` = 14 дней — соответствует типичной UX-норме
         «помнить две недели».

      3. `app.mount("/static", StaticFiles(...))` — отдаёт аватары
         из `BASE_DIR/static/profile_pics/`. `check_dir=False` —
         приложение стартует и без каталога (см. `frontend_spa.py`,
         аналогичный приём).

      4. `app.add_exception_handler(RequestValidationError, ...)`
         и `app.include_router(router_blog_api)` — JSON-роутер
         блога + кастомный обработчик 422 для красивых сообщений
         валидации. `RequestValidationError` импортируется
         **локально** — он нужен только здесь, и поднимать его в
         шапку модуля ради одного использования нет смысла.

    Почему вызывается именно из `create_app()`, а не из `main.py`:
      Сборка приложения (каркас) живёт в `create_fastapi.py`, наполнение
      (доменные роутеры) — в `main.py`. Блог относится к каркасу: он
      вешает middleware и mount, и это должно произойти **до** того,
      как `main.py` начнёт добавлять `include_router` для доменов.
      Подробнее о разделении «каркас vs наполнение» — в
      `docs/14_create_fastapi_factory.md`.
    """
    logF.info("register_md_articles: подключение middleware, static, router_blog_api")

    app.middleware("http")(inject_current_user_middleware)

    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.web.secret_key,
        max_age=14 * 24 * 3600,
    )

    app.mount(
        "/static",
        StaticFiles(directory=BASE_DIR / "static", check_dir=False),
        name="static",
    )

    from fastapi.exceptions import RequestValidationError

    app.add_exception_handler(
        RequestValidationError,
        custom_request_validation_exception_handler,
    )

    app.include_router(router_blog_api)
