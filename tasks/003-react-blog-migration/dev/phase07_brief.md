# Фаза 7: Удаление Jinja + SPA fallback — задание backend-dev

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Спецификация фазы — в REQUIREMENTS.md, секция «Фаза 7: Удаление Jinja + SPA fallback».
Прочитай AGENTS.md и REQUIREMENTS.md первым шагом (по одному разу). Прогресс фазы 1 —
tasks/current/dev/phase01_progress.md (api_blog.py, обработчики ошибок, счётчик 54);
фронтенд-фазы 2–6 закрыты, `frontend/dist` собирается (`cd frontend && npm run build`).

Сделай фазу 7 целиком:

1. `fastapi-application/md_articles/__init__.py`:
   - удалить импорты и include старых роутеров (routes_main, routes_users, routes_articles);
   - удалить HTML-обработчики ошибок (`_register_error_handlers` целиком: StarletteHTTPException,
     403, 404, 500) — ошибки возвращаются как JSON FastAPI по умолчанию;
     НО сохранить обработчик RequestValidationError (custom_request_validation_exception_handler
     из api_blog.py — формат {errors} для /api/blog, дефолт для остальных);
   - остаются: middleware сессии, current_user-middleware, mount /static, include router_blog_api.
2. `fastapi-application/md_articles/web_utils.py`:
   - удалить Jinja2Templates, render_template, flash-механику (_FlashMessagesHelper, _get_flashes);
   - остаются: get_current_user, login_user, logout_user, _ensure_csrf_token, validate_csrf,
     hash_password, verify_password (что из них реально используется после удаления старых роутов —
     проверь импортами api_blog.py и __init__.py; неиспользуемое из списка тоже можно убрать,
     но get_current_user/login_user/logout_user/hash_password/verify_password нужны точно).
3. `fastapi-application/main.py`:
   - mount `/assets` → StaticFiles(BASE_DIR.parent / "frontend" / "dist" / "assets", check_dir=False);
   - catch-all роут `/{full_path:path}` СТРОГО после всех include_router и mount: отдаёт
     FileResponse(BASE_DIR.parent / "frontend" / "dist" / "index.html"); если файла нет —
     404 JSON с подсказкой собрать фронтенд (`npm run build`); пути, начинающиеся с `api/`,
     внутри catch-all → 404 JSON (не index.html). Не забудь про `/docs`, `/redoc`, `/openapi.json` —
     они регистрируются до catch-all и не должны перехватываться (порядок регистрации!).
4. Удалить: `fastapi-application/templates/` целиком (git rm -r), `fastapi-application/static/art_css/base.css`,
   `fastapi-application/static/art_css/scripts.js` (каталог content_art уже перенесён в фазе 1).
   ВАЖНО: перед удалением templates/ проверь, что ничего из оставшегося кода не импортирует
   templates/web_utils Jinja-часть (grep по 'templates' в md_articles/, main.py, create_fastapi.py).
5. Старые модули роутеров `md_articles/routes_main.py`, `routes_users.py`, `routes_articles.py`:
   удалить файлы (они больше не подключаются).

Чекпоинт (сырой вывод — в tasks/current/dev/phase07_raw.txt):
- `cd fastapi-application && ../.venv/bin/ruff check .` — чисто.
- `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` → 40.
- Сначала собери фронтенд: `cd frontend && npm run build`.
- На запущенном сервере (перезапусти uvicorn на :8000, свой старый процесс погаси по PID):
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/` → 200, тело — frontend/dist/index.html;
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/art/Max/1787932544` → 200;
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/static/profile_pics/default.jpg` → 200;
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/blog/articles` → 200;
  - `curl -s http://127.0.0.1:8000/art_home | grep -c 'id="root"'` → 1 (старый путь отдаёт SPA);
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/blog/nonexistent` → 404 JSON;
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/assets/` → не 500 (404 допустим);
  - регресс: `/docs` → 200, `/api/v1/dep_examples/single-direct-dependency` → 200 (с заголовком foobar),
    `/users/get_all_users`, `/orders/get_all_orders` → 200.

Дисциплина: читать только свою зону (md_articles/, main.py, create_fastapi.py по необходимости);
план файлов до первой записи; существующие файлы — точечные edit; сырые выводы — в
tasks/current/dev/phase07_raw.txt; прогресс — tasks/current/dev/phase07_progress.md;
ошибку чинить узко; полный smoke — один раз в конце. Сервер оставь работать после фазы
(нужен qa/adversary), но перезапусти с новой версией.

Отчитайся: список изменённых/удалённых файлов, счётчик маршрутов, вердикты по curl.
