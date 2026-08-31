# ADVERSARIAL_REVIEW.md — находки adversary

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md)
Прогон: 2026-08-31, короткая сессия по изменённой функциональности (/api/blog, SPA fallback).
Сырые выводы: tasks/current/e2e/adv_raw.txt. Скриншоты не делались (JSON API, без визуальной части).

## ADV-001: POST /api/blog/logout выполняется без CSRF-токена

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: `curl -b jar -X POST http://127.0.0.1:8000/api/blog/logout` без заголовка X-CSRF-Token и без поля csrf_token.
Expected: По контракту REQUIREMENTS.md logout — state-changing POST и требует CSRF-заголовок; ожидал 403 "CSRF token mismatch".
Actual: HTTP 200, `{"message":"You have been logged out","category":"success"}` — сессия сброшена без CSRF-защиты. Это противоречит и таблице контракта (колонка CSRF: заголовок), и поведению остальных POST-роутов (register/login/account/meta/add_all все корректно отклоняют 403). Атака CSRF logout в реальности малоопасна, но контракт нарушен и непоследователен.

Disposition: ACCEPTED -> DEF-001

## ADV-002: Повторный GET /api/blog/csrf бесшумно разлогинивает пользователя

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: MEDIUM

What I did: Залогинился (jar с валидной сессией), затем снова запросил `GET /api/blog/csrf` с тем же jar, после чего вызвал `POST /api/blog/art_manage/add_all` с новым токеном.
Expected: GET csrf просто возвращает существующий (или обновлённый) токен и не влияет на аутентификацию; последующие запросы с новой сессией работают.
Actual: Cookie `session` перезаписывается на совершенно новый анонимный cookie (сессия сброшена, user_id исчез): `add_all` тем же jar вернул 403 {"detail":"Authentication required"}. Найдено при попытке обновить CSRF после logout-подобного поведения; воспроизводится стабильно. Побочный эффект: любой компонент фронтенда, который вызовет getCsrfToken() после логина, разлогинит пользователя.

Disposition: REJECTED - не воспроизводится при контролируемом повторе оркестратором (2026-08-31): login → повторный GET /api/blog/csrf с тем же jar → current_user по-прежнему возвращает пользователя id=7, сессия не сбрасывается (контрвывод в tasks/current/e2e/adv_raw.txt дополнялся проверкой оркестратора). Вероятная причина исходного наблюдения — потеря/перезапись cookie-jar между curl-вызовами в прогоне adversary, а не поведение сервера. Критерий успеха 7 (register/login/logout) и 9 (art_manage с авторизацией) подтверждены qa независимо.

## ADV-003: Загрузка не-изображения в /api/blog/account даёт 500 вместо 4xx

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: MEDIUM

What I did: Авторизовался, отправил POST /api/blog/account multipart с корректным полем csrf_token и файлом-текстовиком (не изображение), замаскированным под .png.
Expected: Валидная ошибка пользователя (422 с текстом «файл не является изображением») — по логике 1:1 с routes_users.py, где не-image отклонялся; JSON-ошибка под /api/*.
Actual: HTTP 500 "Internal Server Error". Трейсбек в /tmp/uvicorn_phase07.log: `md_articles/api_blog.py:381 account_post_api` → `_save_picture` (api_blog.py:206) → `PIL.UnidentifiedImageError: cannot identify image file`. Исключение из PIL не перехвачено — не-image файл валит эндпоинт.

Disposition: ACCEPTED -> DEF-002

## ADV-004: GET /api (без слэша) отдаёт SPA index.html вместо 404 JSON

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: `curl http://127.0.0.1:8000/api` (без завершающего слэша, --path-as-is).
Expected: По контракту фазы 7 путь под `/api/*`, не попавший в API-роуты, должен получать 404 JSON, а не index.html (чекпоинт: `/api/blog/nonexistent` → 404 JSON).
Actual: HTTP 200 с телом frontend/dist/index.html: catch-all перехватывает `/api` (без слэша), потому что префикс совпадает с `/api/` только при наличии слэша. Сравнение: `/api/` и `/api/blog/nonexistent` корректно возвращают 404 JSON. Несообразная, но удивительная утечка границы SPA. Suggested severity LOW, поскольку это граничный случай без известных данных под `/api`, но контракт формально нарушен.

Disposition: ACCEPTED -> DEF-003

## ADV-005: HEAD на существующий GET-эндпоинт /api/blog/articles даёт 404

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: `curl -I http://127.0.0.1:8000/api/blog/articles` (HEAD), подтверждено сырым HTTP-запросом через сокет.
Expected: Для GET-роутов FastAPI/Starlette HEAD обычно отвечает 200 без тела; ожидал валидный ответ с заголовками.
Actual: Стабильный `HTTP/1.1 404 Not Found`, `content-length: 22` — вероятно, HEAD матчится на catch-all/специфику роутинга. При этом HEAD на сам catch-all (`/some/spa/path`) отвечает 200 — неконсистентно. Возможно ограничение текущей связи catch-all и API-роутера; удивило, потому что для SPA-клиентов или прокси, проверяющих доступность API через HEAD, это даёт ложный 404.

Disposition: REJECTED - вне контракта: REQUIREMENTS.md не требует HEAD-семантики ни для одного эндпоинта; SPA-клиент (fetch/axios) не использует HEAD. Catch-all объявлен в спеке фазы 7 с methods=["GET"] — 404/405 для не-GET методов на этом слое — ожидаемое поведение роутера Starlette, не дефект миграции.

## ADV-006: Email с пробелами в начале/конце проходит аутентификацию

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: Зарегистрировал adv1@t.io, затем POST /api/blog/login с email " adv1@t.io " (пробелы с двух сторон).
Expected: Либо валидация 422 (пробелы в email), либо 401 — как для UPPER CASE варианта ("ADV1@T.IO" → 401).
Actual: HTTP 200, успешный вход. Пробельные email принимаются (по-видимому, значение не strip'ается) — непоследовательно с чувствительностью к регистру; удивило, но может быть унаследованной логикой 1:1 со старым кодом.

Disposition: REJECTED - работает как задумано, унаследовано 1:1: api_blog.py делает `email.strip()` перед SELECT при логине (старый routes_users.py валидировал формы wtforms с strip-пробелами так же); вход с « adv1@t.io » эквивалентен вводу с лишними пробелами в форме старого блога. Регистронезависимость адресов не входит в контракт REQUIREMENTS.md (валидация/тексты переносятся как есть).

## ADV-007: Username принимается с эмодзи и иероглифами, длина не считается по-униформному

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: Зарегистрировал пользователя с username "юникод😀用户" (8 «символов», 20 байт UTF-8); также сменил username через account на "юникод😀".
Expected: Если ограничение «2–20 символов» — проверка должна быть однозначной (руны vs байты) и документировать принятый формат.
Actual: Регистрация и смена username прошли с 200 — эмодзи/иероглифы допускаются без ограничений Unicode-нормализации. Ограничение 2–20 при этом отбило 10000 'a'. Не является дефектом безопасности, но удивило: username пользователя в профиле может содержать emoji и смешанные алфавиты — вероятно, так и задумано (старый блог тоже это допускал), поэтому предлагаю LOW/заметка.

Disposition: REJECTED - работает как задумано: ограничение 2–20 символов задано контрактом REQUIREMENTS.md и реализовано (len() по символам, что отсекает 10000 'a'); состав алфавита не ограничивался ни спекой, ни старым wtforms-кодом. Изменение правил username — вне рамок задания («Изменение логики валидации» — исключено).

## ADV-008: POST /api/blog/art_manage/meta позволяет перезаписывать уже зарегистрированные записи (не только новые)

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: Авторизованный POST meta с file_name существующей записи "FastAPI_CodeReview.docx.md" и новым title "Colonial", затем восстановил yaml из бэкапа.
Expected: Если meta предназначена только для новых/несвязанных файлов (судя по add_all), ожидал отказ для уже существующей записи.
Actual: 200 "Обновлена запись для FastAPI_CodeReview.docx.md" — запись перезаписана (восстановлено). Удивило, потому что может быть осознанным редактированием реестра (функциональность из старого блога — тогда это РАБОТАЕТ КАК ЗАДУМАНО); фиксирую как намерение проверить у qa/оркестратора.

Disposition: REJECTED - работает как задумано: редактирование существующих записей — штатная функция управления реестром, сохранённая из старого блога (art_manage в routes_articles.py редактировал записи мета-формами; спека фазы 6 требует «форма редактирования для каждой строки → POST meta»). Ответ «Обновлена запись…» явно различает редактирование от добавления.

## ADV-009: add_all создаёт записи с пустыми author/lang и title из имени файла

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: Положил тестовый файл content_art/adv_test_article.md, вызвал add_all, посмотрел articles.yaml (затем восстановил yaml и удалил файл).
Expected: Либо валидные значения полей (по аналогии со старым блогиным add_all), либо явное сообщение, что запись создана-черновиком.
Actual: Создана запись с `author: ''`, `lang: ''`, `title: adv_test_article` (stem). Статья при этом недоступна по /articles/{id}? — нет, она в реестре с complete: false; в общем списке /articles отображается (фильтрация по complete на стороне фронта?), но без автора/языка. Удивило — вероятно, это портированная логика add_all «добавить все новые файлы», которая оставляет заполнение на пользователе через meta (ADV-008 подтверждает, что meta умеет редактировать).

Disposition: REJECTED - работает как задумано, портировано 1:1: старый art_manage_add_all (routes_articles.py:131+) создавал записи-черновики точно так же (author/lang пустые, title = stem имени файла), заполнение мета-данных — следующий шаг пользователя через meta. complete: false корректно исключает статью из публичного списка (/api/blog/articles фильтрует по _is_complete).

## ADV-010: OPTIONS на POST-эндпоинт → 405; HEAD/GET путаница на catch-all с POST дает 405 без Allow-заголовка

- Session: Миграция блога md_articles на React | adversarial
- Suggested severity: LOW

What I did: `curl -X OPTIONS http://127.0.0.1:8000/api/blog/login`, `curl -X POST /some/spa/path` (catch-all).
Expected: OPTIONS обычно возвращает 200 с методом/Allow или 405 стандартно; POST на GET-catch-all — 405 c Allow: GET, HEAD.
Actual: OPTIONS → 405 (без Allow), POST/PUT/DELETE/PATCH на catch-all → 405 (проверил — заголовка Allow не заметил). Не нарушает функциональность, но удивило для фронтенд-клиентов, которые могут префлайтить (если фронт ходит с другого origin — CORS не настроен: нет Access-Control-Allow-Origin). Вероятно РАБОТАЕТ КАК ЗАДУМАНО: SPA ходит по same-origin через прокси/dev-server, CORS и префлайты не нужны. Зафиксировано для триажа.

Disposition: REJECTED - работает как задумано: SPA работает same-origin (dev — vite-прокси, прод — тот же FastAPI origin), CORS-префлайты и кросс-доменные запросы не входят в контракт REQUIREMENTS.md; JWT/CORS явно не вводились. 405 для не-GET на catch-all со methods=["GET"] — штатное поведение Starlette.