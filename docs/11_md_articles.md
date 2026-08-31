# 11. md_articles — блог: FastAPI JSON API + React SPA

Документ описывает пакет `fastapi-application/md_articles/` (JSON API `/api/blog`)
и клиентскую часть `frontend/` (React SPA). Блог портирован с Flask (flask-blog-1,
исходник `templates_flaskblog/`, только для чтения) через промежуточную версию
на Jinja2 (архивы заданий `tasks/001-md-articles-blog/`, `tasks/002-two-dark-themes/`);
текущая архитектура — результат задания «Миграция блога md_articles на React»
(React + TypeScript + Vite + Tailwind CSS v4, см. архив следующего задания).

## Назначение

Одностраничное React-приложение поверх JSON API FastAPI:

- список статей из YAML-реестра `md_articles/articles.yaml`;
- страницы статей: Markdown рендерится **на сервере** (`fenced_code`, `tables`),
  React получает готовый HTML, highlight.js подсвечивает код на клиенте;
- вход / регистрация / аккаунт (cookie-сессии starlette + bcrypt, CSRF,
  аватар с ресайзом 125×125);
- управление реестром статей (`/art_manage`: add_all + мета-формы);
- темы сайта (dark/light/midnight/aurora) и 15 тёмных тем подсветки кода —
  переключение без перезагрузки.

Контент-статьи (`.md`-файлы) кладёт пользователь в
`fastapi-application/content_art/` — команда их не создаёт.

## Структура

```
fastapi-application/
├── md_articles/
│   ├── __init__.py        # register_md_articles(): SessionMiddleware, current_user-middleware, mount /static, router_blog_api
│   ├── api_blog.py        # JSON API /api/blog (12 эндпоинтов) + CSRF-хелперы + RequestValidationError-хендлер
│   ├── schema_art.py      # ArticleLang + YAML-реестр (mtime-кэш, last-good-state, атомарная запись); контент — BASE_DIR/content_art
│   ├── models.py          # BlogUser / BlogPost
│   ├── web_utils.py       # get_current_user, login_user, logout_user, hash_password, verify_password
│   └── articles.yaml      # реестр статей
├── content_art/           # .md-статьи (кладёт пользователь)
├── static/
│   └── profile_pics/      # default.jpg (125×125) + загруженные аватары
└── main.py                # include router_blog_api, mount /assets, SPA catch-all

frontend/                  # React SPA (не коммитится в dist/)
├── index.html             # hljs + 15 тёмных тем (link-swap), анти-вспышка темы
├── vite.config.ts         # dev :5173, прокси /api и /static → :8000
├── src/
│   ├── api/               # client.ts (fetch, credentials, CSRF), blog.ts, auth.ts, artManage.ts
│   ├── components/        # Layout, Header, ArticleCard, MarkdownContent, Toast, селекторы тем
│   ├── context/AuthContext.tsx
│   ├── hooks/             # useTheme, useHljsTheme (localStorage 'theme' / 'hljs-theme')
│   ├── pages/             # HomePage, ArticlePage, AboutPage, LoginPage, RegisterPage, AccountPage, ArtManagePage
│   └── types.ts
└── dist/                  # npm run build (в .gitignore; FastAPI раздаёт при наличии)
```

## Маршруты

### JSON API (`/api/blog`, роутер `router_blog_api` в `api_blog.py`)

| Маршрут | Метод | Доступ |
|---|---|---|
| `/api/blog/csrf` | GET | — (создаёт/возвращает csrf_token сессии) |
| `/api/blog/current_user` | GET | — |
| `/api/blog/register` | POST | — + заголовок X-CSRF-Token |
| `/api/blog/login` | POST | — + X-CSRF-Token |
| `/api/blog/logout` | POST | — + X-CSRF-Token |
| `/api/blog/account` | GET | только авторизованный |
| `/api/blog/account` | POST | авторизованный + CSRF (поле формы `csrf_token`; multipart с аватаром) |
| `/api/blog/articles` | GET | — (только полные записи) |
| `/api/blog/articles/{art_id}` | GET | — (готовый HTML в `article.content`) |
| `/api/blog/art_manage` | GET | только авторизованный |
| `/api/blog/art_manage/add_all` | POST | авторизованный + X-CSRF-Token |
| `/api/blog/art_manage/meta` | POST | авторизованный + X-CSRF-Token |

Ошибки `/api/*` — JSON (`{"detail": ...}` или `{"errors": {поле: [тексты]}}` для 422).
Валидация 422 в формате `errors` действует только для `/api/blog` (остальное
приложение сохраняет дефолтный FastAPI-формат).

### SPA-слой

- `mount /static` → аватары (`static/profile_pics/`);
- `mount /assets` → `frontend/dist/assets` (сборка фронтенда, `check_dir=False`);
- catch-all `GET /{full_path:path}` (последним в `main.py`) → `frontend/dist/index.html`;
  пути `/api` и `/api/*` дают 404 JSON; при отсутствии `dist/index.html` — 404 JSON
  с подсказкой `npm run build`.

Всего маршрутов приложения: 40 route-объектов (21 API + `/docs`, `/redoc`,
`/openapi.json`, `/docs/oauth2-redirect` + 12 JSON-роутов блога + mount `/static`
+ mount `/assets` + catch-all). Быстрая проверка:
`cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"`.

## Архитектура и слои

Подключение — `create_fastapi.py::create_app()` вызывает `register_md_articles(app)`:

1. **middleware** `inject_current_user_middleware` — загружает `current_user`
   (по `session["user_id"]`) в `request.state`; поверх `SessionMiddleware`
   starlette (подписанные cookie, 14 дней, ключ `settings.web.secret_key`).
2. **mount** `/static` → аватары.
3. **RequestValidationError** — `custom_request_validation_exception_handler`
   из `api_blog.py`: `/api/blog` → `{"errors": ...}`, остальные — дефолт FastAPI.
4. **роутер** `router_blog_api`.

Фронтенд: BrowserRouter, страницы по контрактам API, `AuthContext` (инициализация
`GET /current_user`), toast вместо серверных flash, защита `/account` и
`/art_manage` через `RequireAuth` (+ 403 от API как страховка). Аутентификация —
cookie-сессии, JWT не используется. Темы: `data-theme` на `<html>` + CSS-переменные,
`localStorage['theme']`; подсветка: swap `<link>` по `disabled`,
`localStorage['hljs-theme']` (дефолт `vs2015`), код всегда на тёмном фоне.

Данные:

- `BlogUser` / `BlogPost` (SQLAlchemy 2.0) реэкспортированы в `db_core/__init__.py`
  для Alembic; таблицы `blog_user`, `blog_post` (миграция `b59cbdf15878`).
- Сессия БД — `CurrentSession` из `db_core/db_async.py`.
- `schema_art.py` — реестр: mtime-кэш, last-good-state при ошибке парсинга
  (`get_registry_error()` отдаётся в art_manage), атомарная запись
  (tempfile + `os.replace`). Контент и реестр резолвятся от `BASE_DIR`.

## Режимы запуска

Dev (два процесса, vite проксирует `/api` и `/static` на :8000):

```bash
cd fastapi-application && ../.venv/bin/uvicorn main:main_app --port 8000
cd frontend && npm run dev          # http://localhost:5173
```

Прод (SPA раздаёт сам FastAPI):

```bash
cd frontend && npm run build        # frontend/dist
cd fastapi-application && ../.venv/bin/uvicorn main:main_app --port 8000
curl -s http://127.0.0.1:8000/      # 200, SPA index.html
```

## Ключевые отличия от Jinja-версии

| Jinja-версия (до миграции) | React-версия |
|---|---|
| 16 HTML-роутов блога + Jinja2Templates | 12 JSON-эндпоинтов `/api/blog` + SPA catch-all |
| серверные flash-сообщения | toast в React по `message`/`category` из JSON |
| HTML-ошибки 403/404/500 | JSON-ошибки (FastAPI default + errors-формат для /api/blog) |
| Bootstrap 5.3.8 | Tailwind CSS v4 + CSS-переменные тем |
| `require_login` → 307 редирект | `require_login_api` → 403 JSON |
| контент в `templates/content_art/` | `fastapi-application/content_art/` |
| redirect 307 после POST-форм | клиентские редиректы React Router |

Что сохранено 1:1: реестр `articles.yaml`, тексты сообщений и валидации, логика
`_is_complete`/`_is_valid_email`/проверок уникальности, `add_all` (записи-черновики
с title из stem, заполнение через meta), ресайз аватара 125×125, ключи
`localStorage['theme']`/`['hljs-theme']`, список 15 тёмных тем hljs и SRI-ссылки CDN.
