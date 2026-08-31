# Миграция блога md_articles на React + TypeScript + Vite + Tailwind CSS v4

Полный порт клиентской части блога `md_articles` с серверного рендера Jinja2 на одностраничное React-приложение. Бэкенд остаётся на FastAPI, но вместо HTML-шаблонов отдаёт JSON-эндпоинты под SPA: авторизация, статьи, управление реестром. Старые Jinja-роуты, шаблоны и Bootstrap удаляются в последней фазе.

## Подтверждённые решения

- Новая папка `frontend/` в корне репозитория: **Vite + React 18 + TypeScript + React Router + Tailwind CSS v4**.
- Dev-режим: `npm run dev` на `:5173`, Vite проксирует `/api/*` и `/static/*` на `http://localhost:8000`.
- Прод-режим: `npm run build` собирает в `frontend/dist`; FastAPI раздаёт `/assets/*` из `frontend/dist/assets`, а всё остальное (кроме `/api/*` и `/static/*`) отдаёт `frontend/dist/index.html` (catch-all для SPA-роутинга).
- Сборка `frontend/dist` **не коммитится** (строка `dist` в корневом `.gitignore` сохраняется): перед прод-запуском фронтенд собирается локально (`npm run build`); при отсутствии сборки приложение отвечает `404` JSON с подсказкой собрать фронтенд.
- Дизайн — современный красочный: градиентные акценты, карточки со скруглением и мягкими тенями, плавные CSS-переходы, сочные акцентные цвета (фиолетовый/изумрудный/розовый по темам). Bootstrap 5.3.8 полностью уходит.
- Темы сайта сохраняются: `dark`, `light`, `midnight`, `aurora`. Переключение — мгновенно через атрибут `data-theme` на `<html>` и CSS-переменные, без перезагрузки. Ключ `localStorage['theme']` сохранить.
- Подсветка кода — **highlight.js**, 15 тёмных тем (тот же список, что сейчас), переключение без перезагрузки через swap активной `<link>`. Ключ `localStorage['hljs-theme']` сохранить. Код всегда на тёмном фоне в любой теме сайта.
- Markdown рендерится на сервере тем же движком (`markdown` с `fenced_code`, `tables`); React получает готовый HTML в JSON и вставляет его; highlight.js подсвечивает блоки на клиенте.
- Аутентификация остаётся на cookie-сессиях starlette + bcrypt + CSRF; **JWT не вводится**.
- Новые JSON-эндпоинты блога — под префиксом `/api/blog`.
- Флеш-сообщения сервера заменяются клиентскими toast в React: бэкенд возвращает сообщения внутри JSON-ответов (`message` + `category`), фронтенд показывает их.
- Аватары — multipart upload через fetch, ресайз до 125×125 на бэкенде, сохранение в `fastapi-application/static/profile_pics/`.
- Ошибки под `/api/*` — JSON. Редиректы 307 из старой логики `require_login` для API не используются: вместо них 403 JSON.
- Удаление Jinja — последняя фаза: уходят `templates/*.html`, Jinja2Templates, HTML-обработчики 403/404/500, старые роуты `main/users/articles`. `templates/content_art/` переносится в `fastapi-application/content_art/`, путь правится в `schema_art.py`.
- Не трогать: `/api/v1`, `example_sql`, `ex_order_product`, `db_core`, `alembic`, модели `BlogUser`/`BlogPost`, реестр `md_articles/articles.yaml`. Логика блога (валидация, тексты, фильтрация) переносится как есть.
- Ветка `react_fastapi` уже создана. Node v24.19.0 + npm 11.17.0.
- Тестовые фреймворки, SSR и новые тяжёлые зависимости не добавляются.

## Результат

- `frontend/` — полноценное React SPA со сборкой Vite, Tailwind v4, React Router, темами и hljs.
- `fastapi-application/md_articles/api_blog.py` — JSON API роутер с префиксом `/api/blog`.
- `fastapi-application/content_art/` — пользовательские `.md`-статьи (перенесены из `templates/content_art/`).
- `fastapi-application/md_articles/schema_art.py` — путь к контенту указывает на `BASE_DIR / "content_art"`.
- `fastapi-application/md_articles/__init__.py` — убраны HTML-обработчики ошибок и старые роутеры; оставлены middleware сессии, current_user и mount `/static`.
- `fastapi-application/md_articles/web_utils.py` — убраны Jinja2Templates, `render_template`, flash; оставлены сессия, current_user, CSRF-хелперы, хеширование.
- `fastapi-application/main.py` — подключён `router_blog_api`, mount `/assets` и catch-all для SPA.
- Удалены `templates/` (19 `.html`-файлов), старые `static/art_css/base.css` и `static/art_css/scripts.js`.

## Вне рамок

- Демонстрационная часть `/api/v1` и `api/`.
- Домены `example_sql` (`/users`) и `ex_order_product` (`/orders`).
- `db_core`, Alembic, модели, миграции.
- Тестовые фреймворки, SSR, JWT, WebSocket.
- Изменение логики валидации, текстов ошибок, реестра статей, поведения фильтрации.
- Исправление известных дефектов внешних роутов (`/api/v1/depends_function_annotated/my_items/{item_id}` и т.п.).

## Backend — Frontend: контракт API

Базовый URL для фронтенда — `/api/blog`. Все запросы к API идут с `credentials: 'include'` (cookie-сессии). State-changing запросы (POST) требуют CSRF-токена:

- `GET /api/blog/csrf` — создаёт/возвращает `csrf_token` из сессии.
- Для JSON-запросов: заголовок `X-CSRF-Token: <token>`.
- Для multipart `/api/blog/account`: поле формы `csrf_token` (как сейчас).

| Метод | Путь | Тело / Параметры | Успех | Ошибки | CSRF |
|---|---|---|---|---|---|
| GET | `/api/blog/csrf` | — | `200 { "csrf_token": "..." }` | — | нет |
| GET | `/api/blog/current_user` | — | `200 { "user": User\|null }` | — | нет |
| POST | `/api/blog/register` | JSON `{username, email, password, confirm_password}` | `200 {message, category}` | `400` уже авторизован; `422 {errors}` | заголовок |
| POST | `/api/blog/login` | JSON `{email, password, remember?}` | `200 {message, category, user}` | `401 {message, category}`; `400` уже авторизован | заголовок |
| POST | `/api/blog/logout` | — | `200 {message, category}` | — | заголовок |
| GET | `/api/blog/account` | — | `200 { user }` | `403` | нет |
| POST | `/api/blog/account` | multipart `{username, email, picture?, csrf_token}` | `200 {message, category, user}` | `403`; `422 {errors}` | поле формы |
| GET | `/api/blog/articles` | — | `200 { "articles": [...] }` | — | нет |
| GET | `/api/blog/articles/{art_id}` | — | `200 { "article": {...} }` | `404` | нет |
| GET | `/api/blog/art_manage` | — | `200 {articles, unassigned_files, missing_entries, yaml_error}` | `403` | нет |
| POST | `/api/blog/art_manage/add_all` | — | `200 {message, category}` | `403` | заголовок |
| POST | `/api/blog/art_manage/meta` | JSON `{file_name, author, lang, title}` | `200 {message, category}` | `403`; `422 {errors}` | заголовок |

Тип `User`:

```json
{
  "id": 1,
  "username": "...",
  "email": "...",
  "image_file": "..."
}
```

Формат `errors` для `422`:

```json
{
  "errors": {
    "username": ["This field is required."]
  }
}
```

Для остальных ошибок (`403`, `401`, `400`, `404`) используется стандартный FastAPI-формат `{"detail": "..."}` либо `{"message": "...", "category": "..."}` там, где это указано в таблице.

## Изменение счётчика маршрутов

| Фаза | Ожидаемое число route-объектов | Примечание |
|---|---|---|
| До задания | 42 | 25 старых + 16 объектов блога + mount `/static` |
| 1 | 54 | +12 JSON-роутов блога; старые роуты блога живы |
| 2–6 | 54 | backend не меняется |
| 7 | 40 | −16 старых роутов блога, + mount `/assets`, + catch-all SPA |

## Координация оркестратора

- До старта фазы 2: обновить таблицу «Зоны и проверки» в AGENTS.md — frontend-dev получает зону `frontend/` с проверкой `npm run build`; зона backend-dev дополняется JSON API (`md_articles/api_blog.py`).
- После фазы 8: adversary-прогон по SPA и `/api/blog` (стандартный цикл QWEN.md), находки — в ADVERSARIAL_REVIEW.md, триаж — оркестратор.
- При закрытии задания: переписать `docs/11_md_articles.md` под новую архитектуру, обновить счётчик маршрутов в AGENTS.md/QWEN.md.

## План фаз

Единица исполнения — фаза: одно делегирование, бюджет ~10–15 ходов. Следующая фаза стартует только после зелёного checkpoint и ревью диффа оркестратором. Прогресс фазы разработчик фиксирует в `tasks/current/dev/phaseNN_progress.md`.

| # | Фаза | Исполнитель | Файлы | Контракт | Checkpoint | Бюджет ходов |
|---|---|---|---|---|---|---|
| 1 | JSON API блога + перенос контента | backend-dev | `md_articles/api_blog.py`, `md_articles/__init__.py`, `md_articles/schema_art.py` + git mv `templates/content_art` → `content_art` | 12 эндпоинтов `/api/blog`, CSRF через `X-CSRF-Token`, `get_path_dir()` → `BASE_DIR / "content_art"` | ruff чист; `len(main_app.routes) == 54`; `/api/blog/csrf`, `/api/blog/articles`, старый `/art_home` работают | ~15 |
| 2 | Каркас Vite + React + Tailwind | frontend-dev | `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig*.json`, `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css` и др. | dev-server `:5173` с прокси `/api` и `/static`; `npm run build` → `frontend/dist` | `npm install && npm run build` без ошибок | ~12 |
| 3 | Темы, hljs, лейаут, навигация, API-клиент | frontend-dev | `frontend/src/index.css`, `frontend/src/hooks/*`, `frontend/src/components/*`, `frontend/src/api/client.ts`, `frontend/src/types.ts`, `frontend/index.html` | `data-theme` + 15 hljs-ссылок, `localStorage['theme']`/`hljs-theme`, Layout с Header | `npm run build` без ошибок | ~12 |
| 4 | Публичные страницы: home, about, статья | frontend-dev | `frontend/src/pages/HomePage.tsx`, `ArticlePage.tsx`, `AboutPage.tsx`, `frontend/src/api/blog.ts` | `/`, `/about`, `/art/:author/:artId`; список статей; рендер HTML-контента + hljs | `npm run build` без ошибок | ~12 |
| 5 | Авторизация: register, login, account | frontend-dev | `frontend/src/pages/RegisterPage.tsx`, `LoginPage.tsx`, `AccountPage.tsx`, `frontend/src/components/Toast.tsx`, `frontend/src/context/AuthContext.tsx` | toast по `message/category`, multipart аватар, обновление current_user | `npm run build` без ошибок | ~12 |
| 6 | Управление реестром art_manage | frontend-dev | `frontend/src/pages/ArtManagePage.tsx`, компоненты форм реестра | `/art_manage`; add_all + meta; перезагрузка данных после мутаций | `npm run build` без ошибок | ~10 |
| 7 | Удаление Jinja + SPA fallback | backend-dev | `md_articles/__init__.py`, `md_articles/web_utils.py`, `main.py` + удаление `templates/`, `static/art_css/base.css`, `static/art_css/scripts.js` | только `router_blog_api`; catch-all на `/` → `frontend/dist/index.html`; `/assets` из `frontend/dist/assets` | ruff чист; `len(main_app.routes) == 40`; `/`, `/art/...`, `/static/profile_pics/default.jpg`, `/api/blog/articles` работают; старые `/art_home`, `/login`, `/register` → 404 | ~12 |
| 8 | Финальная проверка | qa | `tasks/current/e2e/phase08_final.md`, `DEFECTS.md` при необходимости | все критерии успеха из таблицы ниже | все критерии зелёные либо дефекты заведены | ~10 |

### Фаза 1: JSON API блога + перенос контента

- Файлы:
  - `fastapi-application/md_articles/api_blog.py` (новый) — все JSON-эндпоинты `/api/blog`.
  - `fastapi-application/md_articles/__init__.py` — подключить `router_blog_api` рядом со старыми роутерами; добавить глобальный обработчик `RequestValidationError` в формат `{errors: ...}`.
  - `fastapi-application/md_articles/schema_art.py` — `get_path_dir()` возвращает `BASE_DIR / "content_art"`.
  - git mv `fastapi-application/templates/content_art/` → `fastapi-application/content_art/`.
- Контракт:
  - Новый роутер `router_blog_api` с `prefix="/api/blog"`, `tags=["blog api"]`.
  - Эндпоинты и форматы ответов — по таблице «Backend — Frontend: контракт API».
  - `require_login_api` возвращает `403 JSON`, не редирект.
  - Валидация CSRF для JSON — по заголовку `X-CSRF-Token`; для `/account` — поле формы `csrf_token`.
  - Проверка email, уникальности username/email, сохранение аватара (125×125) — логика 1:1 с `routes_users.py`.
  - Старые роутеры `router_main`, `router_users`, `router_articles` не удаляются и продолжают работать.
- Шаги:
  1. Перенести `templates/content_art/` в `fastapi-application/content_art/`.
  2. Поправить `get_path_dir()` в `schema_art.py`.
  3. Создать `api_blog.py` с Pydantic-схемами, зависимостями, эндпоинтами.
  4. В `__init__.py` импортировать и подключить `router_blog_api`; добавить обработчик валидационных ошибок.
  5. Проверить ruff и счётчик маршрутов.
- Checkpoint:
  - `cd fastapi-application && ../.venv/bin/ruff check .` — чисто.
  - `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` → `54`.
  - `curl -s http://127.0.0.1:8000/api/blog/csrf` → `200` и JSON с `csrf_token`.
  - `curl -s http://127.0.0.1:8000/api/blog/articles` → `200` и массив статей.
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/art_home` → `200` (старый блог жив).
  - Регресс: `/api/v1/dep_examples/single-direct-dependency`, `/users/get_all_users`, `/orders/get_all_orders` отдают 200/JSON.
- Готовность фазы: API отвечает по контракту, старый блог не сломан, ruff чист.

### Фаза 2: Каркас Vite + React + Tailwind

- Файлы: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json` (и `tsconfig.node.json` при необходимости), `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/src/vite-env.d.ts`.
- Контракт:
  - Vite dev server на порту `5173`.
  - Прокси: `/api` → `http://localhost:8000`, `/static` → `http://localhost:8000`.
  - Скрипт `npm run build` собирает в `frontend/dist`.
  - Tailwind CSS v4 подключён через `@import "tailwindcss"` в `index.css` (или эквивалентный официальный способ v4).
  - React-приложение монтируется в `<div id="root">`.
- Шаги:
  1. Инициализировать проект через `npm create vite@latest frontend -- --template react-ts` или руками.
  2. Установить зависимости: `react`, `react-dom`, `react-router-dom`, `tailwindcss`, `@tailwindcss/vite` (или PostCSS-плагин v4), `@types/react`, `@types/react-dom`, `typescript`, `vite`.
  3. Настроить `vite.config.ts` с прокси.
  4. Создать минимальный `App.tsx` и `index.css`.
- Checkpoint:
  - `cd frontend && npm install && npm run build` — завершается без ошибок.
  - `frontend/dist/index.html` существует.
- Готовность фазы: фронтенд собирается, dev-прокси настроена.

### Фаза 3: Темы, hljs, лейаут, навигация, API-клиент

- Файлы: `frontend/src/index.css`, `frontend/src/hooks/useTheme.ts`, `frontend/src/hooks/useHljsTheme.ts`, `frontend/src/components/ThemeSelect.tsx`, `frontend/src/components/HljsThemeSelect.tsx`, `frontend/src/components/Header.tsx`, `frontend/src/components/Layout.tsx`, `frontend/src/App.tsx`, `frontend/src/api/client.ts`, `frontend/src/types.ts`, `frontend/index.html`.
- Контракт:
  - Темы сайта: `dark`, `light`, `midnight`, `aurora`; переключение через `document.documentElement.setAttribute('data-theme', ...)`, сохранение в `localStorage['theme']`, восстановление при старте.
  - 15 тёмных hljs-тем: тот же список, что в `_hljs_theme_select.html`; активная ссылка переключается по `id`; выбор хранится в `localStorage['hljs-theme']`, по умолчанию `vs2015`.
  - highlight.js и его темы подключаются с CDN в `index.html` (как сейчас, глобальный `hljs`) — это сохраняет доказанный механизм link-swap без перезагрузки.
  - `Layout` с `Header`: ссылки «Статьи», «Управление», «Аккаунт/Вход/Регистрация/Выход», «О сайте», селекторы темы и hljs.
  - `client.ts`: fetch-обёртка с `credentials: 'include'`, метод `getCsrfToken()` → `GET /api/blog/csrf`, `postJson()` с заголовком `X-CSRF-Token`, `postMultipart()` с полем `csrf_token`.
  - React Router: `/` (home), `/about`, `/art/:author/:artId`, `/login`, `/register`, `/account`, `/art_manage`. Несуществующий путь ведёт на `/`.
- Шаги:
  1. Описать CSS-переменные для 4 тем.
  2. Реализовать хуки и компоненты селекторов.
  3. Встроить 15 `<link data-hljs-dark id="hljs-theme-..." ... disabled>` в `index.html` + одну светлую ссылку (disabled).
  4. Собрать Layout и Header.
  5. Реализовать базовый API-клиент.
- Checkpoint:
  - `cd frontend && npm run build` — без ошибок.
  - В `frontend/dist/index.html` присутствуют все 15 hljs-ссылок с `data-hljs-dark`.
- Готовность фазы: темы и hljs переключаются без перезагрузки, навигация и API-клиент готовы.

### Фаза 4: Публичные страницы: home, about, статья

- Файлы: `frontend/src/pages/HomePage.tsx`, `frontend/src/pages/AboutPage.tsx`, `frontend/src/pages/ArticlePage.tsx`, `frontend/src/api/blog.ts`, `frontend/src/components/ArticleCard.tsx`, `frontend/src/components/MarkdownContent.tsx`.
- Контракт:
  - `HomePage`: `GET /api/blog/articles`, отображает только полные статьи в виде карточек; ссылка ведёт на `/art/:author/:artId`.
  - `ArticlePage`: парсит `author` и `artId` из URL, запрашивает `GET /api/blog/articles/{art_id}`, вставляет `article.content` как HTML, вызывает `hljs.highlightAll()` после монтирования/обновления.
  - `AboutPage`: статическая страница без обращения к API.
  - Код в статьях отображается на тёмном фоне в любой теме сайта.
- Шаги:
  1. Реализовать страницы и компоненты.
  2. Подключить маршруты в `App.tsx`.
  3. Убедиться, что `dangerouslySetInnerHTML` используется только для доверенного серверного HTML.
- Checkpoint:
  - `cd frontend && npm run build` — без ошибок.
- Готовность фазы: публичные страницы собираются и маршрутизируются.

### Фаза 5: Авторизация: register, login, account

- Файлы: `frontend/src/pages/RegisterPage.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/AccountPage.tsx`, `frontend/src/components/Toast.tsx`, `frontend/src/context/AuthContext.tsx`, `frontend/src/api/auth.ts` (или `blog.ts`).
- Контракт:
  - `AuthContext`: хранит текущего пользователя, инициализируется через `GET /api/blog/current_user`, обновляется после login/account.
  - `RegisterPage`: форма с валидацией, POST `/api/blog/register`, при успехе toast + редирект на `/login`.
  - `LoginPage`: форма, POST `/api/blog/login`, при успехе обновление пользователя + редирект на `/`.
  - `AccountPage`: GET `/api/blog/account`, форма с multipart upload аватара, POST `/api/blog/account`, обновление пользователя после успеха.
  - `Toast`: отображает `message` + `category` (`success`, `danger`, `info`, `warning`, `message`).
  - Кнопка «Выход» POST `/api/blog/logout`.
- Шаги:
  1. Реализовать AuthContext и toast.
  2. Реализовать страницы.
  3. Подключить защиту маршрутов: `/account` и `/art_manage` доступны только авторизованному пользователю (клиентская проверка + 403 от API).
- Checkpoint:
  - `cd frontend && npm run build` — без ошибок.
- Готовность фазы: авторизация собрана.

### Фаза 6: Управление реестром art_manage

- Файлы: `frontend/src/pages/ArtManagePage.tsx`, компоненты форм редактирования/добавления записей реестра.
- Контракт:
  - Запрос `GET /api/blog/art_manage` при входе на страницу.
  - Таблица статей с полями `file_name`, `author`, `lang`, `title`, флагами `complete` и `file_exists`.
  - Кнопка «Добавить все новые файлы» → `POST /api/blog/art_manage/add_all`.
  - Форма для каждой строки/нового файла → `POST /api/blog/art_manage/meta` (JSON body).
  - Отображение `yaml_error` и списков `unassigned_files`, `missing_entries`.
  - После успешной мутации перезагрузить данные.
- Шаги:
  1. Реализовать страницу и компоненты.
  2. Подключить маршрут `/art_manage`.
- Checkpoint:
  - `cd frontend && npm run build` — без ошибок.
- Готовность фазы: управление реестром собрано.

### Фаза 7: Удаление Jinja + SPA fallback

- Файлы:
  - `fastapi-application/md_articles/__init__.py` — оставить только middleware сессии/current_user, mount `/static` и `router_blog_api`.
  - `fastapi-application/md_articles/web_utils.py` — удалить Jinja2Templates, `render_template`, `flash`, `_FlashMessagesHelper`, `_get_flashes`; оставить `get_current_user`, `login_user`, `logout_user`, `_ensure_csrf_token`, `validate_csrf`, `hash_password`, `verify_password`. Добавить `validate_csrf_header`, если он не вынесен в `api_blog.py`.
  - `fastapi-application/main.py` — добавить `mount("/assets", StaticFiles(...))` и catch-all роут `/{full_path:path}`, возвращающий `FileResponse(BASE_DIR.parent / "frontend" / "dist" / "index.html")`.
  - Удалить: `fastapi-application/templates/` целиком, `fastapi-application/static/art_css/base.css`, `fastapi-application/static/art_css/scripts.js`.
- Контракт:
  - Старые HTML-роуты (`/`, `/home`, `/about`, `/art_home`, `/art/...`, `/art_manage`, `/register`, `/login`, `/logout`, `/account`) удалены.
  - HTML-обработчики ошибок 403/404/500 удалены; ошибки возвращаются как JSON FastAPI по умолчанию.
  - `/static` остаётся для аватаров.
  - `/assets` раздаёт файлы из `frontend/dist/assets`.
  - Любой путь, не попавший в `/api/*`, `/static/*`, `/assets/*`, `/docs`, `/redoc`, `/openapi.json`, отдаёт `frontend/dist/index.html`; внутри catch-all пути, начинающиеся с `api/`, получают `404 JSON` (не index.html).
  - `mount("/assets", StaticFiles(..., check_dir=False))` и catch-all не должны ломать импорт приложения, пока `frontend/dist` не собран: при отсутствии `dist/index.html` catch-all возвращает `404 JSON` с подсказкой выполнить `npm run build`.
  - Порядок регистрации: catch-all — строго после всех `include_router(...)` и mount, иначе перехватит `/api/*`, `/static/*`, `/docs`.
- Шаги:
  1. Удалить старые роутер-импорты и includes из `__init__.py`, удалить `_register_error_handlers`.
  2. Очистить `web_utils.py` от Jinja/flash.
  3. Добавить в `main.py` mount `/assets` и catch-all роут.
  4. Удалить шаблоны и старые CSS/JS.
  5. Проверить ruff, счётчик маршрутов, доступность `/`, `/art/...`, `/static/profile_pics/default.jpg`, `/api/blog/articles`.
- Checkpoint:
  - `cd fastapi-application && ../.venv/bin/ruff check .` — чисто.
  - `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` → `40`.
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/` → `200`, тело — `frontend/dist/index.html`.
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/art/Max/1787932544` → `200`.
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/static/profile_pics/default.jpg` → `200`.
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/blog/articles` → `200`.
  - `curl -s http://127.0.0.1:8000/art_home | grep -c 'id="root"'` → `1` (старый Jinja-путь отдаёт SPA index.html, а не серверный HTML).
  - `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/api/blog/nonexistent` → `404` (JSON, не index.html).
  - `cd frontend && npm run build` — без ошибок.
- Готовность фазы: Jinja полностью убран, SPA fallback работает.

### Фаза 8: Финальная проверка

- Файлы: `tasks/current/e2e/phase08_final.md`, `tasks/current/DEFECTS.md` (если найдены дефекты).
- Контракт: все критерии успеха из таблицы ниже.
- Шаги:
  1. Поднять backend (`uvicorn main:main_app --port 8000`) и, при необходимости, frontend dev-server.
  2. Выполнить curl-сценарии критериев успеха.
  3. Зафиксировать сырые выводы в `e2e/phase08_final.md`.
  4. При нахождении дефектов завести `DEFECTS.md`.
- Checkpoint: все критерии успеха зелёные либо дефекты заведены.
- Готовность фазы: отчёт прогона в `tasks/current/e2e/phase08_final.md`.

## Критерии успеха

Проверяются qa по завершении всех фаз; сырые выводы — в `tasks/current/e2e/phase08_final.md`.

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Приложение стартует, маршруты сошлись | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` | `40` |
| 2 | ruff чист | `cd fastapi-application && ../.venv/bin/ruff check .` | exit 0 |
| 3 | SPA fallback работает | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/art/Max/1787932544` | `200`, тело — `frontend/dist/index.html` |
| 4 | Публичный API статей | `curl -s http://127.0.0.1:8000/api/blog/articles` | `200`, массив статей |
| 5 | Страница статьи с HTML | `curl -s http://127.0.0.1:8000/api/blog/articles/1787932544` | `200`, `article.content` содержит отрендеренный HTML |
| 6 | CSRF и current_user | `curl -s http://127.0.0.1:8000/api/blog/csrf` + `curl -s http://127.0.0.1:8000/api/blog/current_user` | `csrf_token` в JSON; `user == null` для анонима |
| 7 | Регистрация / вход / выход | POST `/api/blog/register` → `200 {message, category}`; POST `/api/blog/login` → `200 {user}`; POST `/api/blog/logout` → `200` | cookie-сессия работает |
| 8 | Аккаунт + аватар | POST `/api/blog/account` с multipart; GET `/api/blog/account` | данные обновлены, аватар сохранён в `static/profile_pics/` |
| 9 | Управление реестром | GET `/api/blog/art_manage` (авторизованный); POST `/api/blog/art_manage/add_all`; POST `/api/blog/art_manage/meta` | JSON-контекст обновляется, `articles.yaml` переписывается |
| 10 | Темы сайта без перезагрузки | статическая проверка: grep по `frontend/src` — переключение через `setAttribute('data-theme')`, без `location.reload`; визуальная приёмка пользователем на dev-сервере | 4 темы переключаются мгновенно, `data-theme` на `<html>` меняется, выбор сохраняется в `localStorage['theme']` |
| 11 | hljs-темы без перезагрузки | статическая проверка: grep по `frontend/src` — swap активной `<link>` по `disabled`, без `location.reload`; визуальная приёмка пользователем | 15 тёмных тем переключаются, активная `<link>` меняется, выбор сохраняется в `localStorage['hljs-theme']` |
| 12 | Фронтенд собирается | `cd frontend && npm run build` | exit 0, `frontend/dist/index.html` и `frontend/dist/assets/` существуют |
| 13 | JSON-ошибки API | `curl -s http://127.0.0.1:8000/api/blog/art_manage` без авторизации | `403` с JSON |
| 14 | Регресс демо-роутов | `curl -s http://127.0.0.1:8000/api/v1/dep_examples/single-direct-dependency` | `200` |
| 15 | Регресс example_sql / orders | `/users/get_all_users`, `/orders/get_all_orders` | `200` |
| 16 | Старые Jinja-страницы удалены | `curl -s http://127.0.0.1:8000/art_home \| grep -c 'id="root"'` (то же для `/login`, `/register`, `/about`) | `1` — отдаётся SPA index.html, а не Jinja-HTML; счётчик `40` подтверждает удаление старых роутов |
| 17 | Статика аватаров на месте | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/static/profile_pics/default.jpg` | `200` |

## Финальные критерии

1. Каждый критерий успеха подтверждён доказательством (`e2e/phase08_final.md`, `DEFECTS.md`, `ADVERSARIAL_REVIEW.md`).
2. `tasks/current/DEFECTS.md` существует только если найдены дефекты; все записи не OPEN.
3. Adversarial-прогон выполнен, ни одна запись `ADVERSARIAL_REVIEW.md` не PENDING.

## Открытые вопросы

Открытых вопросов нет — все решения подтверждены пользователем 2026-08-31 (включая отказ от коммита `frontend/dist`). Спека заморожена; исполнение фаз стартует позже по команде пользователя.

---

# Отчёт о выполнении

- Дата закрытия: 2026-08-31
- Коммит: не выполнялся (ветка `react_fastapi`, изменения в рабочем дереве)

## Итог

Блог md_articles полностью переведён с Jinja2-рендера на React SPA: создан `frontend/`
(Vite + React 18 + TypeScript + React Router + Tailwind CSS v4) и JSON API
`/api/blog` (12 эндпоинтов), Jinja-слой удалён, FastAPI раздаёт SPA через
`/assets` + catch-all. Все 17 критериев успеха подтверждены qa (e2e/phase08_final.md),
счётчик маршрутов 40, ruff чист; 3 дефекта adversary исправлены и закрыты qa.

## Изменения

- `frontend/` (новый) — React SPA: каркас Vite+Tailwind (фаза 2), темы/hljs/лейаут/API-клиент (3), публичные страницы (4), авторизация+toast+AuthContext (5), art_manage (6).
- `fastapi-application/md_articles/api_blog.py` (новый) — 12 JSON-эндпоинтов `/api/blog`, CSRF (заголовок/поле формы), 403 вместо редиректов, 422-формат `{errors}` только для `/api/blog`.
- `fastapi-application/md_articles/__init__.py` — SessionMiddleware, current_user-middleware, mount `/static`, `router_blog_api`; Jinja-роутеры и HTML-обработчики ошибок удалены (фаза 7).
- `fastapi-application/md_articles/web_utils.py` — только сессии/current_user/bcrypt-хелперы; Jinja/flash удалены.
- `fastapi-application/md_articles/schema_art.py` — контент из `BASE_DIR / "content_art"`.
- `fastapi-application/content_art/` — git mv из `templates/content_art/`.
- `fastapi-application/main.py` — mount `/assets`, SPA catch-all `/{full_path:path}` (404 JSON для `/api*`, подсказка `npm run build` без dist).
- Удалены: `md_articles/routes_main.py`, `routes_users.py`, `routes_articles.py`, `templates/` (19 html), `static/art_css/base.css`, `static/art_css/scripts.js`.
- Документация: `docs/11_md_articles.md` переписан под React-архитектуру; QWEN.md/AGENTS.md — стек, таблица роутеров, дерево, счётчик 42→40; AGENTS.md — зоны frontend/backend.
- Дефект-фиксы: `api_blog.py` (logout CSRF; PIL-перехват → 422 errors.picture), `main.py` (`/api` без слэша → 404 JSON).

## Критерии успеха

| # | Критерий | Результат | Доказательство |
|---|---|---|---|
| 1 | Счётчик маршрутов 40 | PASS | e2e/phase08_final.md (routes=40) |
| 2 | ruff чист | PASS | e2e/phase08_final.md (All checks passed) |
| 3 | SPA fallback /art/Max/1787932544 | PASS | e2e/phase08_final.md (200, id="root") |
| 4 | GET /api/blog/articles | PASS | e2e/phase08_final.md (200, 5 статей) |
| 5 | Статья с HTML | PASS | e2e/phase08_final.md (content с p/h1/h2/table) |
| 6 | CSRF + current_user | PASS | e2e/phase08_final.md |
| 7 | Регистрация/вход/выход | PASS | e2e/phase08_final.md (cookie-сессии) |
| 8 | Аккаунт + аватар | PASS | e2e/phase08_final.md (мultipart, profile_pics) |
| 9 | Управление реестром | PASS | e2e/phase08_final.md (meta/add_all, реестр восстановлен) |
| 10 | Темы сайта без перезагрузки | PASS (статическая часть) | e2e/phase08_final.md (setAttribute('data-theme'), нет location.reload); визуальная приёмка — пользователь |
| 11 | hljs-темы без перезагрузки | PASS (статическая часть) | e2e/phase08_final.md (swap по disabled, 15 ссылок); визуальная приёмка — пользователь |
| 12 | npm run build | PASS | e2e/phase08_final.md (exit 0) |
| 13 | JSON-ошибки API (403) | PASS | e2e/phase08_final.md |
| 14 | Регресс dep_examples | PASS | e2e/phase08_final.md (200 с заголовком foobar) |
| 15 | Регресс /users, /orders | PASS | e2e/phase08_final.md |
| 16 | Старые Jinja-пути отдают SPA | PASS | e2e/phase08_final.md (/art_home, /login, /register, /about → id="root") |
| 17 | Статика аватаров | PASS | e2e/phase08_final.md (default.jpg 200) |

## Дефекты

- DEF-001 (LOW, ADV-001): logout без CSRF → 403. ИСПРАВЛЕНО backend-dev, CLOSED qa — e2e/qa_retest_001_raw.txt.
- DEF-002 (MEDIUM, ADV-003): не-изображение в account → 500; исправлено на 422 errors.picture. ИСПРАВЛЕНО, CLOSED — e2e/qa_retest_002_raw.txt.
- DEF-003 (LOW, ADV-004): GET /api без слэша отдавал SPA; исправлено на 404 JSON. ИСПРАВЛЕНО, CLOSED — e2e/qa_retest_003_raw.txt.

## Adversarial-прогон

10 находок (e2e/adv_raw.txt, ADVERSARIAL_REVIEW.md): ADV-001/003/004 ACCEPTED → DEF-001/002/003 (исправлены и закрыты); ADV-002 REJECTED (не воспроизводится при контролируемом повторе оркестратором); ADV-005..010 REJECTED — вне контракта / работает как задумано (причины в disposition каждой записи). PENDING-записей нет.

## Участники

- backend-dev: фаза 1 (JSON API + перенос контента), фаза 7 (удаление Jinja + SPA fallback), фиксы DEF-001..003.
- frontend-dev: фазы 2–6 (каркас, темы/hljs/лейаут, публичные страницы, авторизация, art_manage).
- qa: фаза 8 (17/17 критериев PASS, e2e/phase08_final.md), заведение DEF-001..003, ретест — все CLOSED.
- adversary: враждебный прогон — 10 находок, данные реестра восстановлены.
- оркестратор: ревью фаз, триаж adversary, обновление docs/QWEN.md/AGENTS.md, архивирование.
