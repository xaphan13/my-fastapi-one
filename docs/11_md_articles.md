# 11. md_articles — блог на FastAPI + Jinja2

Документ описывает пакет `fastapi-application/md_articles/` — порт учебного блога
flask-blog-1 (исходник: `templates_flaskblog/`, только для чтения) на стек текущего
проекта. Порт выполнен по заданию «Порт блога flask-blog-1 на FastAPI + Jinja»
(архив: `tasks/NNN-md-articles-blog/`). Дизайн и логика перенесены 1:1; отличия —
только там, где стек FastAPI требует иного механизма (сессии, CSRF, формы).

## Назначение

Серверный рендеринг Jinja2 поверх тех же данных, что были во Flask-версии:

- список статей из YAML-реестра `md_articles/articles.yaml`;
- страницы статей: Markdown → HTML (расширения `fenced_code`, `tables`);
- вход / регистрация / аккаунт (bcrypt, сессии, аватар с миниатюрой 125×125);
- управление реестром статей (`/art_manage`);
- HTML-страницы ошибок 403 / 404 / 500.

Контент-статьи (`.md`-файлы) кладёт пользователь в
`fastapi-application/templates/content_art/` — команда их не создаёт.

## Структура

```
fastapi-application/
├── md_articles/
│   ├── __init__.py        # register_md_articles(): middleware, mount /static, ошибки, роутеры
│   ├── routes_main.py     # /, /home, /about
│   ├── routes_users.py    # /register, /login, /logout, /account (+Pydantic-формы)
│   ├── routes_articles.py # /art_home, /art/…, /art_manage, /art_manage/add_all, /art_manage/meta
│   ├── schema_art.py      # ArticleLang + YAML-реестр (mtime-кэш, last-good-state, атомарная запись)
│   ├── models.py          # BlogUser / BlogPost
│   ├── web_utils.py       # Jinja2Templates, сессия, current_user, flash, CSRF, require_login
│   └── articles.yaml      # реестр статей (порт из шаблона)
├── templates/             # 19 Jinja2-шаблонов (порт из templates_flaskblog/templates/)
│   ├── content_art/       # пустая папка (.gitkeep) — статьи кладёт пользователь
│   ├── includes/          # 8 подключаемых фрагментов (header, footer, макрос форм, …)
│   ├── errors/            # 403.html, 404.html, 500.html
│   ├── new_art/           # art_home, art_author, art_manage
│   └── layout.html, about.html, login.html, register.html, account.html
└── static/
    ├── art_css/           # base.css, scripts.js (порт из Flask-версии, доработаны)
    └── profile_pics/      # default.jpg (125×125) + загруженные аватары
```

## Маршруты

Имена эндпоинтов (`name=`) сохранены от Flask-блюпринтов — `url_for` в шаблонах
работает без правок (`url_for('users.login')` и т.д.).

| Маршрут | Методы | name | Доступ |
|---|---|---|---|
| `/`, `/home` | GET | `main.home` | — (редирект на `/art_home`) |
| `/about` | GET | `main.about` | — |
| `/art_home` | GET, POST | `art_main.art_home` | — |
| `/art/{author}/{art_id}` | GET | `art_main.art_author` | — |
| `/art_manage` | GET | `art_main.art_manage` | только авторизованный |
| `/art_manage/add_all` | POST | `art_main.art_manage_add_all` | только авторизованный + CSRF |
| `/art_manage/meta` | POST | `art_main.art_manage_meta` | только авторизованный + CSRF |
| `/register` | GET, POST | `users.register` | — |
| `/login` | GET, POST | `users.login` | — |
| `/logout` | GET | `users.logout` | — |
| `/account` | GET, POST | `users.account` | только авторизованный + CSRF |

Маршрут `/createDB` из Flask-версии НЕ переносился: таблицы `blog_user`/`blog_post`
создаёт Alembic-миграция `b59cbdf15878` (третья ревизия, поверх `35ae229e79dd`).

Всего маршрутов приложения: 42 route-объекта (25 старых + 16 объектов блога: 11 имён,
где пары GET/POST у `/register`, `/login`, `/account`, `/art_home` и пара
`/`+`/home` дают по отдельному объекту + 1 mount `/static`). Быстрая проверка:
`cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"`.

## Архитектура и слои

Подключение — одной функцией из `create_fastapi.py::create_app()`
(фабрика осталась нетронутой, добавлен только вызов `register_md_articles(app)`):

1. **middleware** `inject_current_user_middleware` — до роутов загружает
   `current_user` (по `session["user_id"]`) в `request.state`; работает поверх
   `SessionMiddleware` (starlette), сессия со сроком жизни 14 дней
   (`max_age=14*24*3600`), ключ — `settings.web.secret_key`
   (`APP__WEB__SECRET_KEY`, дефолт — dev-значение).
2. **mount** `/static` → `fastapi-application/static/` (StaticFiles).
3. **обработчики ошибок** 403/404/500 (+catch-all `Exception` → 500) рендерят
   HTML-шаблоны `errors/*.html` вместо JSON; redirect-HTTPException(307) из
   dependency конвертируется в настоящий редирект.
4. **роутеры** `router_main`, `router_users`, `router_articles`.

Данные:

- `md_articles/models.py` — `BlogUser` / `BlogPost` (SQLAlchemy 2.0, типы из
  `db_core/type_for_models.py`), обе модели реэкспортированы в
  `db_core/__init__.py` (иначе Alembic их не видит). Таблицы: `blog_user`,
  `blog_post`.
- Сессия БД — только через `CurrentSession` из `db_core/db_async.py`.
- `md_articles/schema_art.py` — реестр статей: чтение `articles.yaml`
  с mtime-кэшем; при ошибке парсинга сохраняется последнее рабочее состояние
  (last-good-state), ошибка доступна через `get_registry_error()` (шаблон
  `art_manage.html` показывает её в alert). Запись — атомарная
  (tempfile + `os.replace`). Контент-каталог и реестр резолвятся от `BASE_DIR`,
  не от cwd.
- Аутентификация — `bcrypt` (хеш/проверка в `web_utils.py`), вход —
  `session["user_id"]`.

## Ключевые отличия от Flask-версии

| Flask (templates_flaskblog) | FastAPI (md_articles) |
|---|---|
| flask_login (UserMixin, login_required) | dependency `require_login` + `current_user` в `request.state`; `BlogUser.is_authenticated` — property-совместимость |
| flask_wtf CSRF (hidden_tag) | собственный токен в сессии (`secrets.token_hex(32)`), скрытое поле `csrf_token` во всех POST-формах, несовпадение → 403 |
| WTForms-валидация | Pydantic-схемы + ручной сбор ошибок; тексты ошибок и Bootstrap-классы (`is-invalid`, `invalid-feedback`) сохранены |
| flask session (dict) | starlette SessionMiddleware (подписанные cookie, 14 дней) |
| `/createDB` (db.create_all) | Alembic-миграция `b59cbdf15878` |
| ConfigLogger (logFC) | существующий `logF` из `config_log.py` |
| пути контента от cwd | привязка к `BASE_DIR` |
| remember-me менял срок cookie | чекбокс остался в разметке; срок сессии фиксированный 14 дней |

Что перенесено без изменений: дизайн (Bootstrap 5.3.8 + highlight.js с CDN и SRI),
реестр `articles.yaml`,
логика фильтрации неполных записей (`_is_complete`), тексты flash-сообщений.
`static/art_css/base.css` и `scripts.js` изначально перенесены 1:1, позже
доработаны: добавлены темы `midnight`/`aurora` и селектор темы
(см. `tasks/002-two-dark-themes/`).

## Проверка работоспособности

```bash
cd fastapi-application && ../.venv/bin/uvicorn main:main_app --port 8000
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://127.0.0.1:8000/   # 307 -> /art_home
curl -s http://127.0.0.1:8000/art_home                                            # 200, HTML
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/static/art_css/base.css  # 200
```

Полный набор проверок задания (регистрация, CSRF, 404 HTML, регресс старых
эндпоинтов) — в архиве задания `tasks/NNN-md-articles-blog/` (e2e-заметки).
