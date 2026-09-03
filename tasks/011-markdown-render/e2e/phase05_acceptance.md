# Фаза 5 — Приёмка и регресс

- **Дата:** 2026-09-02
- **Задание:** Настройка рендеринга Markdown-статей (таблицы + подсветка кода)
- **Сервер:** запущен в фоне из `fastapi-application/` (`uvicorn main:main_app --host 127.0.0.1 --port 8000`), `PID=3114842`, `openapi=200` на момент завершения фазы — **оставлен работать для adversary-прогона** (оркестратор погасит при закрытии задания).
- **Сборка фронтенда:** `cd frontend && npm run build` → `EXIT=0`, артефакты:
  `dist/assets/index-BATzKDJ1.css` (21.86 kB), `dist/assets/index-CRfN6Iav.js` (195.96 kB).

## Сводка по критериям

| # | Критерий | Результат | Доказательство |
|---|---|---|---|
| 1 | Таблицы рендерятся и стилизованы | PASS | 33/33 статей содержат `<table` в `article.content` (см. ниже). В собранном CSS найдено правило `.markdown-content table{border-collapse:separate;border-spacing:0;border:1px solid var(--border);border-radius:var(--radius);width:100%;...overflow:hidden}` и поднабор `border-bottom/box/collapse/color/left/radius/right/spacing/top/top-width` (т.е. рамки и скругление присутствуют). |
| 2 | Подсветка для всех языков статей | PASS | Серверная разметка: `language-env`×1, `language-jinja2`×4, `language-vue`×1, `language-jsx`×1, `language-javascript`×2, `language-dockerfile`×1 (от `dockerfile`) + `language-Dockerfile`×1 (от `Dockerfile` через алиас), `language-http`×1. Клиентская часть: `frontend/dist/index.html` подключает `highlight.min.js` + `languages/dockerfile.min.js` + `languages/http.min.js` (все три с SRI sha384); `frontend/dist/assets/index-*.js` содержит вызовы `hljs.registerAliases(...)` (env, jinja2, vue, txt/text, js/jsx, make, Dockerfile, toml) и `highlightAll`. Источник `MarkdownContent.tsx` строки 20–28: 7 алиасов регистрируются ДО `hljs?.highlightAll()` на строке 28. |
| 3 | Сборка фронтенда без ошибок | PASS | `cd frontend && npm run build` → `EXIT=0`, `tsc && vite build` зелёные, 56 модулей трансформированы, gzip 5.37 KB CSS / 62.99 KB JS (сырой вывод `tasks/current/dev/phase05_build.txt`). |
| 4 | Без новых зависимостей | PASS | `git diff --stat -- pyproject.toml uv.lock frontend/package.json` → пусто. `git diff -- frontend/package-lock.json` → пусто. |
| 5 | Контент статей не изменён | PASS | `git diff --stat -- fastapi-application/content_art/` → пусто. |
| 6 | Счётчик маршрутов не изменился | PASS | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` → `ROUTES_NOW = 41` (ROUTES_BEFORE = 41 в `phase01_diagnosis.md`). |
| 7 | Регресс базовых эндпоинтов | PASS | `/docs` → 200, `/users/get_all_users` → 200, `/orders/get_all_orders?params=id` → 200, `/api/v1/dep_examples/single-direct-dependency` (`-H 'foobar: x'`) → 200, `/api/blog/articles` → 200, `/api/blog/articles/1788346000` → 200. Без обязательных параметров `/orders/get_all_orders` и `/api/v1/dep_examples/single-direct-dependency` отвечают 422 — это FastAPI-валидация обязательных параметров (openapi: `OrderGetAllOrderbyQuery` enum `{id, time, promocode}`; required header `foobar`). Демо-маршруты по AGENTS.md (`api/dep_examples/` и `pydantic_validator.py`) намеренно требуют параметров для показа паттернов валидации; backend не менялся — это документированное поведение, не регрессия. |
| 8 | Линтер backend чист | PASS | `uv run ruff check .` (из корня) → `All checks passed!`, exit 0 (с учётом настроенных исключений `F401`/`E402`/`F541`). |

**Итог: 8 из 8 PASS. Дефектов не заведено.**

## Методика K7 — почему 422 на двух эндпоинтах не регрессия

Задание трогает только фронтенд (`frontend/src/index.css`, `frontend/index.html`, `frontend/src/components/MarkdownContent.tsx`) — `git status` подтверждает, что backend не менялся. 422 на demo-эндпоинтах — документированный паттерн FastAPI для required-but-missing параметров:

- `/orders/get_all_orders` — openapi определяет `params: OrderGetAllOrderbyQuery` как **required enum** `{id, time, promocode}` → без `?params=` возвращает 422 (контракт endpoint).
- `/api/v1/dep_examples/single-direct-dependency` — openapi определяет required header `foobar` → без заголовка 422 (контракт endpoint).

С параметрами оба отвечают 200. То, что при ручном curl без параметров получаем 422, — это **проверка валидации параметров**, что и демонстрирует один из 9 паттернов `Depends` (см. `docs/05_patterns_di.md`).

## Сырые выводы

- `tasks/current/dev/phase05_build.txt` — `npm run build` (exit 0, размеры, tsc).
- `tasks/current/e2e/phase05_k1_css_evidence.txt` — фрагмент CSS-правила `.markdown-content table{}` из собранного бандла + перечень border-классов.
- Сводный прогон K1/K2/K6/K7/K8: фиксирован в этом файле (`phase05_acceptance.md`).
- K2 регистрация алиасов в источнике: `grep -nE 'registerAliases|highlightAll' frontend/src/components/MarkdownContent.tsx` — строки 20–26 (7 алиасов), строка 28 (`highlightAll`). Контракт фазы 3 выполнен.
