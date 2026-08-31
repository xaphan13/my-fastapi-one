# DEFECTS.md — реестр дефектов

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Триаж находок adversary 2026-08-31: принятые записи ADV-001, ADV-003, ADV-004
воспроизведены qa и заведены ниже. Сырые выводы воспроизведения: tasks/current/e2e/adv_raw.txt.

## DEF-003: GET /api (без слэша) отдаёт SPA index.html вместо 404 JSON

- Status: CLOSED
- Severity: LOW
- Found by: adversary (ADV-004)
- Task: Миграция блога md_articles на React

Steps to reproduce:
1. Поднять приложение: `cd fastapi-application && ../.venv/bin/uvicorn main:main_app --host 127.0.0.1 --port 8000`.
2. Выполнить `curl -s --path-as-is http://127.0.0.1:8000/api -o /tmp/body -w "%{http_code} %{content_type}"`.
3. Посмотреть первые байты тела: `head -c 120 /tmp/body`.

Expected: По контракту фазы 7 путь под `/api/*`, не попавший в API-роуты, должен
получать 404 JSON (`{"detail":"Not Found"}`), а не SPA index.html.

Actual: HTTP 200, `content_type=text/html`, размер 7450 байт — тело `frontend/dist/index.html`
(`<!doctype html><html lang="ru" data-theme="dark">...`). Catch-all перехватывает `/api`
без завершающего слэша, тогда как `/api/` и `/api/blog/nonexistent` корректно возвращают
`404 {"detail":"Not Found"}` (вывод в adv_raw.txt, раздел DEF-003).

History:
- qa: opened — воспроизведён 2026-08-31 (GET /api → 200 text/html 7450 байт; контрольные /api/ и /api/blog/nonexistent → 404 JSON).
- оркестратор: FIX-READY — backend-dev исправил (main.py::spa_fallback, сравнение путей "/api"/"api"/"/api/"/"api/"); curl после фикса: GET /api и /api/ (--path-as-is) → 404 JSON, index.html не отдаётся (deffix_raw.txt).
- qa: closed — ретест 2026-08-31, подтверждён: GET /api и /api/ (--path-as-is) → 404 application/json {"detail":"Not Found"} (qa_retest_003_raw.txt). Регресс: GET /art/Max/1787932544 → 200 SPA.

## DEF-002: Загрузка не-изображения в /api/blog/account даёт 500 вместо 422

- Status: CLOSED
- Severity: MEDIUM
- Found by: adversary (ADV-003)
- Task: Миграция блога md_articles на React

Steps to reproduce:
1. Поднять приложение (см. DEF-001, шаг 1).
2. `GET /api/blog/csrf` → взять `csrf_token`; залогиниться (POST /api/blog/login с jar и X-CSRF-Token).
3. Создать текстовик, замаскированный под png: `printf 'this is not an image, just plain text' > /tmp/qa_masked.png`.
4. Выполнить авторизованный multipart-запрос:
   `curl -b jar -c jar -H "X-CSRF-Token: <token>" -F "csrf_token=<token>" -F "username=qa_def" -F "email=qa_def@example.com" -F "picture=@/tmp/qa_masked.png;type=image/png" http://127.0.0.1:8000/api/blog/account`.
5. Посмотреть хвост лога: `grep -n "UnidentifiedImageError" /tmp/uvicorn_phase07.log`.

Expected: Ошибка валидации для пользователя — 422 JSON с errors по полю `picture`
(«файл не является изображением», по логике 1:1 со старым routes_users.py, где
не-image отклонялся).

Actual: HTTP 500 "Internal Server Error". В логе (строки 1102–1107 `/tmp/uvicorn_phase07.log`):
`md_articles/api_blog.py:206 _save_picture` →
`PIL.UnidentifiedImageError: cannot identify image file <_io.BytesIO ...>`.
Исключение из PIL не перехвачено — не-image файл валит эндпоинт. Вывод в adv_raw.txt, раздел DEF-002.

History:
- qa: opened — воспроизведён с пользователем qa_def@example.com (id=10): 500, traceback UnidentifiedImageError в _save_picture.
- оркестратор: FIX-READY — backend-dev исправил (api_blog.py: PIL-блок в try/except → ValueError, account_post_api возвращает 422 errors.picture «Загруженный файл не является изображением.»); curl после фикса: 422 JSON, пустой picture по-прежнему валиден (deffix_raw.txt).
- qa: closed — ретест 2026-08-31, подтверждён: не-изображение (.png-маска) → 422 {"errors":{"picture":["Загруженный файл не является изображением."]}}; реальная png (PIL) → 200; multipart без picture → 200; UnidentifiedImageError в логе не появился (qa_retest_002_raw.txt).

## DEF-001: POST /api/blog/logout выполняется без CSRF-токена

- Status: CLOSED
- Severity: LOW
- Found by: adversary (ADV-001)
- Task: Миграция блога md_articles на React

Steps to reproduce:
1. Поднять приложение (см. выше): `cd fastapi-application && ../.venv/bin/uvicorn main:main_app --host 127.0.0.1 --port 8000`.
2. Зарегистрировать пользователя (email qa_def@example.com, пароль QaDef12!) и залогиниться
   с cookie-jar и заголовком X-CSRF-Token (токен — из GET /api/blog/csrf).
3. Убедиться, что сессия активна: GET /api/blog/current_user возвращает пользователя.
4. Выполнить `curl -b jar -X POST http://127.0.0.1:8000/api/blog/logout` — без заголовка
   X-CSRF-Token и без поля csrf_token.

Expected: По контракту REQUIREMENTS.md logout — state-changing POST и требует
CSRF-заголовок; ожидался 403 "CSRF token mismatch" — как у register/login/account/meta/add_all,
которые корректно отклоняют запросы без CSRF.

Actual: HTTP 200 `{"message":"You have been logged out","category":"success"}` — сессия
сброшена без CSRF-защиты (после запроса current_user возвращает `{"user":null}`).
Нарушение контракта и непоследовательность с остальными POST-роутами.
Вывод в adv_raw.txt, раздел «DEF-001 retry».

History:
- qa: opened — воспроизведён 2026-08-31 на пользователе qa_def@example.com (id=10)
  из e2e-заметки фазы 8.
- оркестратор: FIX-READY — backend-dev исправил (api_blog.py::logout_api + validate_csrf_header(request)); curl после фикса: POST logout без X-CSRF-Token → 403 {"detail":"CSRF token mismatch"} (deffix_raw.txt).
- qa: closed — ретест 2026-08-31, подтверждён: logout без X-CSRF-Token → 403 {"detail":"CSRF token mismatch"}, сессия сохраняется; logout с X-CSRF-Token после login (qa_def, id=10) → 200, current_user → {"user":null} (qa_retest_001_raw.txt).