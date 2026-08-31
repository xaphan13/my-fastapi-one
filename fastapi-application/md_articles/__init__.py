# ==============================================================================
# +++++++++++++++++++++++++++++ md_articles пакет ++++++++++++++++++++++++++++++
# ------------- JSON API блога для React SPA (Jinja-слой удалён) ---------------
# ------------------------------------------------------------------------------
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles

from base_dir_path import BASE_DIR
from core.config import settings
from config_log import logF

from md_articles.api_blog import (
    custom_request_validation_exception_handler,
    router_blog_api,
)
from md_articles.web_utils import get_current_user
from db_core.db_async import db_manager
from starlette.middleware.sessions import SessionMiddleware


# ==============================================================================
# ++++++++++++++++++++++++++ current_user middleware +++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
async def inject_current_user_middleware(request: Request, call_next):
    """Middleware: загружает current_user для всех HTTP-запросов в блоге."""
    async with db_manager.session_factory() as session:
        await get_current_user(request, session)
        response = await call_next(request)
    return response


# ==============================================================================
# +++++++++++++++++++++++++++++++ register app +++++++++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
def register_md_articles(app: FastAPI) -> None:
    """Подключение блога: сессии, current_user, статика, JSON API роутер."""
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
        RequestValidationError, custom_request_validation_exception_handler
    )

    app.include_router(router_blog_api)
