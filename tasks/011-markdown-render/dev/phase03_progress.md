# Phase 3 — Дозагрузка языков hljs и алиасы

- **Дата:** 2026-09-02
- **Задание:** Настройка рендеринга Markdown-статей (таблицы + подсветка кода)
- **Фаза 3 из плана** (см. `tasks/current/REQUIREMENTS.md`)

## План правок

1. `frontend/index.html` — после основного `<script src=".../highlight.min.js">`
   добавить два `<script>` с language-пакетами `dockerfile.min.js` и `http.min.js`
   (тот же CDN `cdn-release@11.12.0`, SRI sha384, `crossorigin="anonymous"`).
2. `frontend/src/components/MarkdownContent.tsx` — в `useEffect` до
   `highlightAll()` добавить `hljs.registerAliases(...)` для меток, не
   являющихся именами языков hljs 11.12.0.

## Алиасы (полный список из фазы 1 + решение оркестратора по toml)

- `env` → `ini`
- `jinja2`, `vue` → `xml`
- `txt`, `text` → `plaintext`
- `js`, `jsx` → `javascript`
- `make` → `makefile`
- `Dockerfile` → `dockerfile` (после дозагрузки CDN-пакета)
- `toml` → `ini` (в hljs 11.12.0 нет toml, INI структурно близок)

## CDN-пакеты

- `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.12.0/build/languages/dockerfile.min.js`
  SRI: `sha384-/zu1pI8+9j/v/qNlCRRyidiBhGdxfvGwOLXEPBXpKc77eFNUAhccr0WglEQ+x9La`
- `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.12.0/build/languages/http.min.js`
  SRI: `sha384-L0lAPMci4/TxXazgm0dJIgX9udJzIJf78sk4o9v5sYuRVYJSjymFXF13LmyCU3L0`
- Оба URL: HTTP 200 (см. `tasks/current/dev/phase03_build.txt`).

## Сделанные правки

- `frontend/index.html`: два `<script>` language-пакетов добавлены сразу после
  основного скрипта hljs, перед списком тем. Стиль многострочной разметки и
  атрибуты (`integrity`, `crossorigin="anonymous"`) совпадают с соседним
  `<script src="highlight.min.js">`.
- `frontend/src/components/MarkdownContent.tsx`: в `useEffect` через
  `(window as any).hljs` (тот же паттерн, что уже был) перед `highlightAll()`
  добавлен блок `registerAliases`, обёрнутый в `if (hljs?.registerAliases)`.

## Чекпоинт

- `npm run build` — exit 0 (см. `tasks/current/dev/phase03_build.txt`).
- `curl /api/blog/articles/{art_id}` для статьи с dockerfile-блоком
  содержит `language-dockerfile` — текст и команда в `phase03_build.txt`.
