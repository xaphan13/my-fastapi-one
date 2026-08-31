# Фаза 8: Финальная проверка — задание qa

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Прочитай AGENTS.md и REQUIREMENTS.md первым шагом (по одному разу). Твоя задача —
прогнать ВСЕ критерии успеха из таблицы «Критерии успеха» REQUIREMENTS.md (17 штук)
и зафиксировать сырые выводы в tasks/current/e2e/phase08_final.md.

## Окружение

- Backend uvicorn на :8000 УЖЕ запущен (оставлен после фазы 7). Сначала проверь:
  `pgrep -af "uvicorn.*main:main_app"` и `curl -m 3 -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/openapi.json`.
  Если отвечает — НЕ поднимай второй сервер. Если нет — подними сам:
  `cd fastapi-application && ../.venv/bin/uvicorn main:main_app --port 8000` (в фоне).
- Фронтенд собран: `frontend/dist/index.html` существует. Если нет — `cd frontend && npm run build`.
- По окончании проверки СЕРВЕР ОСТАВЬ РАБОТАТЬ (нужен adversary), но он должен быть
  единственным uvicorn main:main_app.

## Сценарии (критерии успеха, один-в-один с REQUIREMENTS.md)

Проверки делай пачками: один shell-вызов — несколько curl, сырой вывод — в заметку
e2e/phase08_final.md, в чат — только вердикты PASS/FAIL по критериям.

1. `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` → 40.
2. `cd fastapi-application && ../.venv/bin/ruff check .` → exit 0.
3. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/art/Max/1787932544` → 200; тело — SPA (`curl -s .../art/Max/1787932544 | grep -c 'id="root"'` → 1).
4. `curl -s http://127.0.0.1:8000/api/blog/articles` → 200, JSON-массив статей.
5. `curl -s http://127.0.0.1:8000/api/blog/articles/1787932544` → 200, article.content содержит отрендеренный HTML (проверь наличие тегов, например `<h`/`<p`/`<pre`).
6. `curl -s http://127.0.0.1:8000/api/blog/csrf` → JSON с csrf_token; `curl -s http://127.0.0.1:8000/api/blog/current_user` → `{"user": null}` (новая cookie-сессия, без jar; если отдало user — проверь, что cookie-файл чист).
7. Регистрация/вход/выход (с cookie-jar и CSRF!):
   - `JAR=/tmp/qa_phase08.jar; rm -f $JAR`
   - `TOKEN=$(curl -s -c $JAR http://127.0.0.1:8000/api/blog/csrf | python3 -c "import sys,json;print(json.load(sys.stdin)['csrf_token'])")`
   - register: `curl -s -b $JAR -c $JAR -X POST -H "Content-Type: application/json" -H "X-CSRF-Token: $TOKEN" -d '{"username":"qa_phase08","email":"qa08@test.local","password":"Qa08pass!","confirm_password":"Qa08pass!"}' http://127.0.0.1:8000/api/blog/register` → 200 {message, category}
   - login: аналогично POST /api/blog/login {"email":"qa08@test.local","password":"Qa08pass!"} → 200, в ответе user
   - current_user с jar → user не null
   - logout: POST /api/blog/logout с CSRF-заголовком → 200; после него current_user → null
   - повторный register с тем же email → 422 с errors (проверка уникальности)
8. Аккаунт + аватар (с новой регистрацией или повторным логином):
   - login снова; GET /api/blog/account → 200 {user}
   - multipart POST /api/blog/account: `curl -s -b $JAR -X POST -F "username=qa_phase08" -F "email=qa08@test.local" -F "csrf_token=$TOKEN" -F "picture=@/tmp/qa_avatar.png;type=image/png" http://127.0.0.1:8000/api/blog/account` → 200 {message, category, user}
   - аватар сначала сгенерируй: `python3 -c "from PIL import Image; Image.new('RGB',(300,300),(120,40,200)).save('/tmp/qa_avatar.png')"` (PIL есть в .venv: `.venv/bin/python`)
   - проверь: ответ 200, файл появился в fastapi-application/static/profile_pics/ (ls по времени), user.image_file обновился; GET /static/profile_pics/<новый файл> → 200
9. Управление реестром (авторизованным):
   - GET /api/blog/art_manage с jar → 200 {articles, unassigned_files, missing_entries, yaml_error}
   - POST /api/blog/art_manage/meta с CSRF: создай временный .md-файл в fastapi-application/content_art/ (например `qa_tmp_check.md` с парой строк), затем meta {"file_name":"qa_tmp_check.md","author":"qa08","lang":"ru","title":"QA temp"} → 200; проверь GET art_manage — запись появилась; ПОТОМ обязательно почисти: удали qa_tmp_check.md И вычти запись из реестра — проще всего через meta с пустым author/lang/title запись станет неполной; но лучше: до мутации сохрани копию fastapi-application/md_articles/articles.yaml (`cp articles.yaml /tmp/articles.yaml.bak`), после проверки восстанови `cp /tmp/articles.yaml.bak articles.yaml` и удали временный .md. Отрази в заметке, что реестр восстановлен.
   - POST /api/blog/art_manage/add_all с CSRF → 200 {message, category} (после восстановления реестра; новых файлов нет → info-сообщение — это ок).
10. Статическая проверка тем: `grep -rn "setAttribute('data-theme'\|setAttribute(\"data-theme\"" frontend/src` — есть; `grep -rn "location.reload" frontend/src` — пусто (нет перезагрузки).
11. Статическая проверка hljs: `grep -rn "disabled" frontend/src/hooks/useHljsTheme.ts` — swap по disabled; `grep -c 'data-hljs-dark' frontend/dist/index.html` → 15; `grep -rn "location.reload" frontend/src` — пусто (тот же grep, что и в 10).
12. `cd frontend && npm run build` → exit 0 (dist/index.html существует).
13. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/blog/art_manage` БЕЗ авторизации → 403, JSON.
14. Регресс: `curl -s http://127.0.0.1:8000/api/v1/dep_examples/single-direct-dependency` → 200 (заголовок foobar НЕ нужен для этого роута; если 422 — проверь с `-H "foobar: 1"`).
15. Регресс: `/users/get_all_users` → 200; `/orders/get_all_orders?params=id` → 200.
16. Старые Jinja-пути: `curl -s http://127.0.0.1:8000/art_home | grep -c 'id="root"'` → 1; то же для `/login`, `/register`, `/about` (каждый → 1).
17. `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/static/profile_pics/default.jpg` → 200.

Дополнительно (сверх таблицы, для полноты): `/docs` → 200.

## Правила

- Код продукта не исправлять. Дефекты — в tasks/current/DEFECTS.md (формат — AGENTS.md),
  с шагами воспроизведения; сырые выводы — в e2e/phase08_final.md.
- Если критерий не подтверждается — FAIL + DEF-запись (или явное объяснение, почему
  это не дефект, а ожидаемое поведение).
- Все проверки выполняй реальными командами; в заметке — команды + сырые ответы.

Отчитайся: таблица «критерий → PASS/FAIL» одним списком + список заведённых DEF-NNN
(если есть) + статус сервера (оставлен/поднят).
