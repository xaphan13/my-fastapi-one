# Исправление DEF-001..003 — задание backend-dev

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Прочитай AGENTS.md и tasks/current/DEFECTS.md (три OPEN-дефекта). Сервер uvicorn
работает на :8000 — после правок перезапусти его (свой старый процесс по PID из
`pgrep -af "uvicorn.*main:main_app"`), оставь работать.

Исправь ровно три дефекта, начиная с наивысшей серьёзности:

1. **DEF-002 (MEDIUM)** — `fastapi-application/md_articles/api_blog.py`, `_save_picture`:
   оберни открытие/обработку изображения (Image.open/thumbnail/save) в try/except
   `PIL.UnidentifiedImageError` (+ общий `Exception` от PIL допустим) и на уровне
   `account_post_api` верни 422 JSON `{"errors": {"picture": ["<текст>"]}}` — текст
   на русском, например «Загруженный файл не является изображением». Не-изображение
   больше не должно давать 500. Пустой picture (файл не выбран) остаётся валидным.

2. **DEF-001 (LOW)** — `fastapi-application/md_articles/api_blog.py`, `logout_api`:
   добавь `await validate_csrf_header(request)` (как в register/login) — logout без
   X-CSRF-Token → 403 JSON.

3. **DEF-003 (LOW)** — `fastapi-application/main.py`, `spa_fallback`: пути `/api`
   и `/api/` (равно как начинающиеся с `api/` и `/api/`) должны отдавать 404 JSON,
   не index.html. Сейчас проверка `startswith(("api/", "/api/"))` не ловит голый
   `/api`. Исправь сравнение (например `path in ("/api", "/api/") or path.startswith("/api/") or path.startswith("api/")`).

Дисциплина: только точечные edit двух файлов; сырые выводы — в
tasks/current/dev/deffix_raw.txt; после правок один контрольный smoke: ruff,
счётчик маршрутов (40), и curl: (a) POST /api/blog/logout без CSRF → 403;
(b) multipart account с не-изображением (авторизованный, с csrf_token) → 422
JSON с errors.picture; (c) GET /api и GET /api/ (--path-as-is) → 404 JSON;
(d) регресс: GET / → 200 SPA, /api/blog/csrf → 200, /docs → 200. Прогресс допиши
в tasks/current/dev/phase07_progress.md (раздел «defect fixes») или создай
defects_fix_progress.md.

Отчитайся ровно одним результатом на дефект: ИСПРАВЛЕНО (с вердиктом curl) —
их оркестратор передаст qa.
