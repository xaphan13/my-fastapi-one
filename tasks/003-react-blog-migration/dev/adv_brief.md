# Adversarial-прогон — задание adversary

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Прочитай AGENTS.md и REQUIREMENTS.md первым шагом (по одному разу).

Изменённая функциональность (объект атаки): React SPA на FastAPI — JSON API
`/api/blog/*` (auth/CSRF/account/avatar/art_manage), SPA fallback `/{full_path:path}`
(отдаёт frontend/dist/index.html), mount `/assets` и `/static`, обработка ошибок
JSON для /api/*.

Окружение: backend uvicorn УЖЕ работает на :8000 (проверь `pgrep -af "uvicorn.*main:main_app"`
и `curl -m 3 http://127.0.0.1:8000/openapi.json`; если не отвечает — подними сам:
`cd fastapi-application && ../.venv/bin/uvicorn main:main_app --port 8000` в фоне,
и оставь работать по окончании). Frontend собран в frontend/dist.

Что пробовать (идеи, не ограничивайся):
- CSRF: POST без токена/с чужим токеном/с чужой сессией; повторный CSRF после logout;
  два параллельных jar'а.
- Аутентификация: login с неверным паролем (401?), register с коллизиями username/email,
  пустые тела, невалидный JSON, огромные поля, unicode/пробельные имена.
- account: multipart без csrf_token-поля, picture не-изображение (например .txt),
  огромная картинка, пустой filename; GET account после logout (403?).
- art_manage: GET/POST анонимом; meta с несуществующим file_name, с path-инъекцией
  (`../`, абсолютный путь), с пустыми полями; add_all повторно.
- SPA fallback: пути `/api/` (не должен отдавать index.html), `/static/../`,
  `/assets/../../`, двойные слэши, `%2e%2e` traversal, корень и глубокие пути,
  HEAD/POST на catch-all (роут только GET — что вернёт?).
- articles: art_id невалидный (строка/отрицательный/огромный), несуществующий id.
- Разное: cookie-подмена session, Content-Type confusion, JSON-тело в multipart-роут
  и наоборот.
- Файлы/логи: ошибки сервера смотри в fastapi-application/log/ и /tmp/uvicorn_phase07.log.

Правила:
- НЕ исправляй код, только находки. Каждая находка — запись в tasks/current/ADVERSARIAL_REVIEW.md
  по точному формату AGENTS.md (ADV-NNN, Session, Suggested severity, What I did /
  Expected / Actual, Disposition: PENDING).
- Реестр articles.yaml и контент content_art/ — рабочие данные: мутации реестра
  допускаются только с полным восстановлением исходного состояния (сделай бэкап
  cp перед мутацией и восстанови после; то же для тестовых .md-файлов).
- Работай пачками: один shell-вызов — несколько curl; сырые выводы можешь писать в
  tasks/current/e2e/adv_raw.txt; в чат — краткий список находок.
- Скриншоты не нужны (JSON API).

Отчитайся: количество находок с номерами ADV-NNN и заголовками одной строкой каждая,
фраза что реестр/контент восстановлены, статус сервера.
