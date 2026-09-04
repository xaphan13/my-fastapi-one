from base_dir_path import BASE_DIR
from config_log import logF

import uvicorn
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
from starlette.routing import Route
from core.config import settings
from create_fastapi import create_app

from api import router_api
from ex_user_post.router_users import r_users_sql
from ex_order_product.router_order_one import r_order_one


main_app = create_app(
    custom_docs_url=False,
)

main_app.include_router(
    router_api,
)

main_app.include_router(
    r_users_sql,
)

main_app.include_router(
    r_order_one,
)

main_app.mount(
    "/assets",
    StaticFiles(directory=BASE_DIR.parent / "frontend" / "dist" / "assets", check_dir=False),
    name="spa_assets",
)


# ==============================================================================
# ++++++++++++++++++++++++++++ SPA catch-all fallback ++++++++++++++++++++++++++
# ------------------------------------------------------------------------------
async def spa_fallback(request):
    """Отдаёт index.html React SPA для всех путей вне api/static/assets/docs."""
    path = request.url.path
    if path in ("/api", "api") or path.startswith("/api/") or path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    index_html = BASE_DIR.parent / "frontend" / "dist" / "index.html"
    if not index_html.is_file():
        return JSONResponse(
            status_code=404,
            content={"detail": "Frontend не собран: выполните npm run build в frontend/"},
        )
    return FileResponse(index_html)


def main():
    logF.info(f"Base dir path :\n{BASE_DIR=}")

    uvicorn.run(
        "main:main_app",
        host=settings.run.host,
        port=settings.run.port,
        # log_config=None,
        reload=True,
    )

    logF.warning(
        "end '-----------------------------' my-fastapi-one '----------------------------' \n\n\n\n"
        "'********************************************************************************'"
    )


if __name__ == "__main__":
    main()

# ==============================================================================
# +++++++++++++ catch-all: строго после всех include_router и mount +++++++++++
# ------------------------------------------------------------------------------
main_app.router.routes.append(Route("/{full_path:path}", spa_fallback, methods=["GET"]))
