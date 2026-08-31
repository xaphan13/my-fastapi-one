# Ретест DEF-001..003 — задание qa

Задание: «Миграция блога md_articles на React». Роль: перепроверка фиксов дефектов
из tasks/current/DEFECTS.md (все в статусе FIX-READY, отчёты разработчика в History).

Сервер uvicorn с исправлениями УЖЕ работает на :8000 (проверь
`curl -m 3 -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/openapi.json`;
если не отвечает — подними: `cd fastapi-application && ../.venv/bin/uvicorn main:main_app --port 8000`, в фоне, и оставь работать).

Перепроверь каждый дефект по его Steps to reproduce из DEFECTS.md:

1. DEF-001: POST /api/blog/logout без X-CSRF-Token → ожидаешь теперь 403 JSON
   "CSRF token mismatch"; с корректным заголовком (после login) → 200 и разлогин.
2. DEF-002: авторизованный multipart POST /api/blog/account с csrf_token
   и не-изображением (.png-маска) → ожидаешь 422 JSON {"errors":{"picture":[...]}} ;
   регресс: multipart с настоящей картинкой (сгенерируй PIL) и без picture → 200.
3. DEF-003: `curl -s --path-as-is http://127.0.0.1:8000/api` и `/api/` → ожидаешь
   404 JSON; контроль: `GET /` → 200 SPA (index.html с id="root").

Пользователь для авторизации: qa_def@example.com / QaDef12! (зарегистрирован ранее).

По каждому дефекту: подтверждён фикс → установи Status: CLOSED и добавь строку
History «- qa: closed — ретест <дата>, <вердикт>». Не подтверждён → Status: OPEN,
строка History «- qa: reopened — <причина>». Файл DEFECTS.md правь только по этому
правилу. Сырые выводы — допиши в tasks/current/e2e/adv_raw.txt (раздел «qa retest»).

Плюс быстрый регресс после фиксов (в ту же пачку): счётчик маршрутов 40, ruff чист,
/api/blog/articles → 200, /art/Max/1787932544 → 200 SPA, /docs → 200,
/api/v1/dep_examples/single-direct-dependency с заголовком foobar → 200.

В чат: вердикт по каждому дефекту (CLOSED/reopened), итог регресса, статус сервера.
