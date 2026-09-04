from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from core.config import settings, SqliteDsn
from db_core.db_async import db_manager
from utils.docs import reg_docs_routes

from config_log import logF


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    logF.info(f"startup lifespan :\n{settings.db.url=} \n{app.title=}")
    if isinstance(settings.db.url, SqliteDsn):
        logF.warning(f"used test sqlite dataBase : {settings.db.url=}")
    yield
    # shutdown
    await db_manager.engine_dispose()


def create_app(custom_docs_url: bool = False) -> FastAPI:
    docs_url, redoc_url = (None, None) if custom_docs_url else ("/docs", "/redoc")

    app = FastAPI(
        title="Example : Fast API - SQL - React",
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
        docs_url=docs_url,
        redoc_url=redoc_url,
    )

    if custom_docs_url:
        reg_docs_routes(app)

    from md_articles import register_md_articles

    register_md_articles(app)

    return app
