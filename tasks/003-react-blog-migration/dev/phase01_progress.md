# Прогресс фазы 1: JSON API блога + перенос контента

- 2026-08-31: git mv templates/content_art -> fastapi-application/content_art — OK
- 2026-08-31: schema_art.py — get_path_dir() -> BASE_DIR / "content_art" — OK (edit)
- 2026-08-31: api_blog.py — создан (12 эндпоинтов /api/blog по контракту) — OK
- 2026-08-31: __init__.py — импорт router_blog_api + include_router + обработчик RequestValidationError ({errors}) — OK
- 2026-08-31: далее — ruff, счётчик маршрутов (ожидание 54), smoke curl
- 2026-08-31: ruff — чисто; len(main_app.routes) == 54
- 2026-08-31: curl-чекпоинт: /api/blog/csrf 200 (csrf_token в JSON), /api/blog/articles 200 (массив статей), /current_user 200 {user:null}, /api/blog/articles/1787932544 200, /art_home 200 (старый блог жив)
- 2026-08-31: регресс: /users/get_all_users 200, /orders/get_all_orders?params=id 200 ([]), /api/v1/dep_examples/single-direct-dependency 200 с заголовком foobar (без него 422 — ожидаемое поведение, обязателен Header)
- 2026-08-31: сырой вывод — phase01_raw.txt; сервер uvicorn на :8000 оставлен для qa/adversary. ФАЗА 1 ГОТОВА
- 2026-08-31: ФИКС-ПРОГОН (2 дефекта ревью): api_blog.py — custom_request_validation_exception_handler стал async, пути вне /api/blog возвращают дефолт FastAPI {"detail": [...]}; удалена мёртвая _install_exception_handler. __init__.py — JSON {"detail"} для всех /api/* в http_exception_handler, forbidden_handler (403) и not_found_handler (404) — у Starlette x-хендлеры приоритетнее хендлера класса. + импорт JSONResponse
- 2026-08-31: контрольный smoke — ruff: All checks passed; len(main_app.routes) == 54; curl a /api/v1/dep_examples без заголовка 422 {"detail":[...]}; curl b POST /api/blog/register без CSRF 403 {"detail":"CSRF token mismatch"}; curl c /api/blog/nonexistent 404 {"detail":"Not Found"}; curl d /api/blog/csrf 200; регресс /art_home 200, /nonexistent-page 404 HTML. Сырой вывод — phase01_fix_raw.txt; сервер uvicorn на :8000 перезапущен, оставлен для qa/adversary