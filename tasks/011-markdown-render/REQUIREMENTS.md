# Настройка рендеринга Markdown-статей (таблицы + подсветка кода)

Статьи блога рендерит серверный python-markdown, а во фронтенде React-приложения
нет стилей для `.markdown-content` и недостаёт ряда языков highlight.js.
Задание — восстановить читаемость таблиц и сделать подсветку кода стабильной
для всех code-fence в статьях, не меняя парсер, не переписывая контент и не
переходя на npm-сборку hljs.

## Подтверждённые решения

1. **Парсер остаётся python-markdown** (`markdown-it-py` / `Pygments` отклонены).
2. **Подсветка — CDN highlight.js**: добираем недостающие языковые пакеты с CDN
   и регистрируем алиасы; на npm-сборку не переходим.
3. **Новые зависимости разрешены**, но для выбранного пути не нужны.
4. **Контент `.md`-статей (`content_art/`) не трогаем**. Если таблица не парсится
   из-за синтаксиса, это фиксируется как отдельная находка для решения
   оркестратора, а не правка контента.
5. **Стили пишем руками** в `frontend/src/index.css` на существующих CSS-токенах
   тем (`var(--border)`, `var(--card-bg)`, `var(--text)`, `var(--text-muted)`,
   `var(--link)`, `var(--radius)` и др.); плагин `@tailwindcss/typography` не
   добавляем.
6. **Архитектура 15 hljs-тем через link-swap** остаётся без изменений.

## Результат

- Блок CSS-правил `.markdown-content` в `frontend/src/index.css`, покрывающий
  таблицы, заголовки, списки, цитаты, встроенный код, разделители и изображения.
- CDN-скрипты недостающих языков hljs в `frontend/index.html`.
- `hljs.registerAliases` в `frontend/src/components/MarkdownContent.tsx`.
- Диагностическая заметка `tasks/current/e2e/phase01_diagnosis.md` с перечнем
  статей с таблицами, результатами парсинга и списком языков, требующих
  дозагрузки / алиасов.
- Приёмочная заметка `tasks/current/e2e/phase05_acceptance.md` с доказательствами
  по каждому критерию успеха.

## Вне рамок

- `fastapi-application/content_art/` — тексты статей не редактируются.
- `fastapi-application/md_articles/routes_articles.py` — мёртвый код Jinja-эры,
  не импортируется.
- `pyproject.toml`, `uv.lock`, `frontend/package.json` — новые зависимости не
  добавляются.
- Смена парсера markdown или подсветки на другую библиотеку.
- Добавление `@tailwindcss/typography`.
- Улучшательства вне сути задачи: оглавление (TOC), якоря заголовков, сноски,
  Mermaid, математические формулы.
- Изменение архитектуры тем hljs (15 тем через link-swap).

## План фаз

Единица исполнения — фаза: одно делегирование, 1–3 файла, бюджет ~10–15 ходов.
Следующая фаза стартует только после зелёного checkpoint и ревью диффа оркестратором.
Прогресс фазы разработчик фиксирует в `tasks/current/dev/phaseNN_progress.md`.

| # | Фаза | Исполнитель | Файлы | Контракт | Checkpoint | Бюджет ходов |
|---|---|---|---|---|---|---|
| 1 | Диагностика рендера | qa | `tasks/current/e2e/phase01_diagnosis.md` | Перечень статей с таблицами, статус парсинга каждой таблицы, точный список языков code-fence без поддержки hljs | Заметка сформирована и содержит (а) количество статей с таблицами, (б) список таблиц, не распарсенных python-markdown (если есть), (в) список языков, требующих дозагрузки CDN-пакетов или алиасов | ~10 |
| 2 | Стили `.markdown-content` | frontend-dev | `frontend/src/index.css` | CSS-блок `.markdown-content` на токенах тем; таблицы читаемы | `npm run build` без ошибок; в собранном `dist/assets/*.css` присутствуют правила `.markdown-content table` с рамками/паддингами | ~10 |
| 3 | Дозагрузка языков hljs и алиасы | frontend-dev | `frontend/index.html`, `frontend/src/components/MarkdownContent.tsx` | CDN-пакеты для языков вне common-бандла; `hljs.registerAliases` для псевдонимов | `npm run build` без ошибок; статья с `dockerfile` возвращает HTML с `language-dockerfile`; предупреждений о неизвестном языке нет | ~12 |
| 4 | Расширения python-markdown (условная) | backend-dev | `fastapi-application/md_articles/schema_art.py` | Список extensions в `render_article()` | Запускается только если фаза 1 нашла таблицы, не парсящиеся из-за строгости python-markdown, и оркестратор решил их чинить; после правки повторно отрендеренные статьи содержат `<table>` | ~8 |
| 5 | Приёмка и регресс | qa | `tasks/current/e2e/phase05_acceptance.md` | Все критерии успеха подтверждены командами | Заметка с PASS/FAIL по каждому критерию; все критерии PASS | ~10 |

### Фаза 1: Диагностика рендера

- **Файлы:** `tasks/current/e2e/phase01_diagnosis.md`.
- **Контракт:**
  - Список `art_id` статей, в `.md`-исходниках которых есть разметка таблиц.
  - Для каждой такой статьи — факт наличия `<table>` в `article.content`
    (ответ `GET /api/blog/articles/{art_id}`).
  - Список языков code-fence по всему `content_art/` с пометкой:
    "входит в common-бандл hljs", "нужен CDN-пакет", "нужен алиас".
  - Если таблица не распарсилась — отдельная запись с фрагментом исходника и
    предполагаемой причиной (нет пустой строки, несовпадение колонок и т.п.).
- **Шаги:**
  1. Получить список статей: `GET /api/blog/articles`.
  2. `grep -Rni '^|' content_art/` — найти кандидаты с таблицами.
  3. Для каждого кандидата выполнить `GET /api/blog/articles/{art_id}` и проверить
     наличие `<table` в `article.content`.
  4. `grep -RniE '^```[[:space:]]*[a-z0-9+-]+' content_art/` — инвентаризация
     языков code-fence.
  5. Сопоставить языки с составом hljs common-бандла 11.12.0 и зафиксировать
     недостающие.
- **Checkpoint:** файл `phase01_diagnosis.md` создан и содержит все перечисленные
  разделы.
- **Готовность фазы:** оркестратор прочитал заметку и принял решение о запуске
  фазы 4 (запускать / пропустить / зафиксировать как находку).

### Фаза 2: Стили `.markdown-content`

- **Файлы:** `frontend/src/index.css`.
- **Контракт:**
  - Новый блок `.markdown-content { ... }` (или `.markdown-content > *` по
    необходимости), использующий существующие CSS-переменные тем.
  - Таблицы: `width: 100%`, рамки `var(--border)`, паддинги ячеек,
    фон шапки `var(--card-bg)`, зебра по чётным строкам, скругление углов
    `var(--radius)`.
  - Заголовки `h1`–`h6`: размеры и отступы, цвет `var(--text)`.
  - Списки `ul`/`ol`: маркеры/нумерация, отступы.
  - `blockquote`: левая рамка `var(--border)`, фон `var(--card-bg)`, отступ.
  - Встроенный `code`: фон `var(--card-bg)`, рамка/скругление.
  - `hr`: цвет `var(--border)`.
  - `img`: `max-width: 100%`, скругление.
  - Ссылки внутри `.markdown-content`: `var(--link)`.
- **Шаги:**
  1. Добавить блок в конец `frontend/src/index.css` (или в логически подходящую
     секцию, сохраняя локальный стиль разделителей).
  2. Убедиться, что стили не ломают существующие глобальные правила.
- **Checkpoint:**
  - `cd frontend && npm run build` завершается без ошибок.
  - `grep -oE '\.markdown-content[^{]*\{[^}]*\}' dist/assets/*.css` (или аналогичная
    проверка собранного бандла) показывает наличие правил для `.markdown-content`.
  - `grep 'markdown-content table' dist/assets/*.css` находит правила таблиц.
- **Готовность фазы:** сборка зелёная, правила присутствуют в бандле.

### Фаза 3: Дозагрузка языков hljs и алиасы

- **Файлы:** `frontend/index.html`, `frontend/src/components/MarkdownContent.tsx`.
- **Контракт:**
  - В `index.html` после основного `<script src="highlight.min.js">` добавлены
    `<script src=".../languages/dockerfile.min.js">` и, если фаза 1 подтвердила,
    `.../languages/http.min.js` (с тем же CDN `cdn-release@11.12.0`, с SRI
    по возможности).
  - В `MarkdownContent.tsx` в `useEffect` перед вызовом `highlightAll()` добавлены
    `hljs.registerAliases(...)`:
    - `env` → `ini`
    - `jinja2` → `xml`
    - `vue` → `xml`
    - `jsx` → `javascript`
    - `txt`, `text` → `plaintext`
  - Алиасы регистрируются строго до `highlightAll()` (иначе первый рендер
    пропустит алиасы); повторная регистрация при смене `html` безопасна.
- **Шаги:**
  1. Добавить `<script>` с CDN-пакетами недостающих языков в `index.html`.
  2. В `MarkdownContent.tsx` добавить `registerAliases` в `useEffect`.
  3. Проверить, что сборка и базовый рендер не сломаны.
- **Checkpoint:**
  - `cd frontend && npm run build` без ошибок.
  - `GET /api/blog/articles/{art_id}` для статьи с `dockerfile` возвращает HTML
    с `<code class="language-dockerfile">` (серверная разметка `fenced_code`;
    hljs-токены вроде `hljs-keyword` появляются только на клиенте после
    `highlightAll()` — их наличие и отсутствие предупреждений
    "Could not find the language" проверяется в DevTools вручную).
  - Для статьи с `env`/`jinja2`/`vue`/`jsx` нет консольного предупреждения
    hljs о неизвестном языке (проверяется вручную в DevTools или через
    отсутствие класса `language-*` без подсветки).
- **Готовность фазы:** сборка зелёная, алиасы и пакеты на месте.

### Фаза 4: Расширения python-markdown (условная)

- **Файлы:** `fastapi-application/md_articles/schema_art.py`.
- **Контракт:**
  - Функция `render_article()` использует только те расширения python-markdown,
    которые напрямую устраняют найденную в фазе 1 проблему парсинга таблиц.
  - Без решения оркестратора расширения не добавляются.
- **Шаги:**
  1. Запускается, только если фаза 1 зафиксировала таблицы, не распарсенные
     python-markdown, и оркестратор/пользователь решил устранить это через
     расширения.
  2. Добавить минимальный набор расширений (кандидаты: `sane_lists`,
     `md_in_html`, `attr_list`) по одному, с проверкой после каждого.
  3. Не добавлять `toc`, `footnotes`, `fenced_code` (уже есть), `tables` (уже
     есть) и прочие улучшательства.
- **Checkpoint:**
  - `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` — счётчик маршрутов не изменился.
  - `uv run ruff check .` чист по изменённым файлам.
  - Повторно отрендеренные «проблемные» статьи содержат `<table>` в
    `article.content`.
- **Готовность фазы:** проблемные таблицы парсятся или фаза пропущена по решению
  оркестратора.

### Фаза 5: Приёмка и регресс

- **Файлы:** `tasks/current/e2e/phase05_acceptance.md`.
- **Контракт:**
  - Доказательства по каждому критерию успеха: curl-выводы/команды, статусы,
    фрагменты HTML/CSS.
- **Шаги:**
  1. Пересобрать фронтенд: `cd frontend && npm run build`.
  2. Запустить приложение из `fastapi-application/` и выполнить регресс:
     `/docs`, `/users/get_all_users`, `/orders/get_all_orders`, один из
     `/api/v1/dep_examples/*`.
  3. Проверить счётчик маршрутов (до/после одно число).
  4. Проверить статьи с таблицами и code-блоками (рекомендуемые разделы:
     Rust, SQLAlchemy, Dockerfile).
  5. Проверить CSS-правила `.markdown-content` в собранном бандле.
- **Checkpoint:**
  - `phase05_acceptance.md` содержит таблицу критериев со статусом PASS/FAIL.
  - Все критерии PASS.
- **Готовность фазы:** все критерии успеха подтверждены.

## Критерии успеха

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Таблицы рендерятся и стилизованы | `curl -s http://127.0.0.1:8000/api/blog/articles/{art_id}\|jq '.article.content'\|grep -o '<table'` для статей с таблицами (список из фазы 1) | `<table` присутствует; в `dist/assets/*.css` найдены правила `.markdown-content table` с рамками и паддингами |
| 2 | Подсветка для всех языков статей | `curl` статей с `dockerfile`, `env`, `jinja2`, `vue`, `jsx`; ручная проверка классов hljs / DevTools console | Нет предупреждений "Could not find the language"; блоки `dockerfile` имеют классы языка; `env`/`jinja2`/`vue`/`jsx` подсвечены через алиасы |
| 3 | Сборка фронтенда без ошибок | `cd frontend && npm run build` | Код выхода 0, нет ошибок TypeScript/Vite |
| 4 | Без новых зависимостей | `git diff -- pyproject.toml uv.lock frontend/package.json package-lock.json` | Нет изменений (если package-lock.json в репозитории — тоже без изменений) |
| 5 | Контент статей не изменён | `git diff -- fastapi-application/content_art/` | Пустой diff |
| 6 | Счётчик маршрутов не изменился | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` | То же число, что и до старта задания; фактическое значение зафиксировать в `phase01_diagnosis.md` до правок (в доках проекта расхождение: QWEN.md — 40, docs/11 — 41) |
| 7 | Регресс базовых эндпоинтов | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/docs`; аналогично `/users/get_all_users`, `/orders/get_all_orders`, `/api/v1/dep_examples/single-direct-dependency` | Все ответы `200` |
| 8 | Линтер backend чист | `uv run ruff check .` (из корня проекта) | Нет ошибок в изменённых файлах (учитывая настроенные исключения `F401`, `E402`, `F541`) |

## Финальные критерии

1. Каждый критерий успеха подтверждён доказательством в
   `tasks/current/e2e/phase05_acceptance.md`.
2. `tasks/current/DEFECTS.md` существует только если найдены дефекты; все записи
   не в статусе OPEN.
3. Adversarial-прогон выполнен, ни одна запись `ADVERSARIAL_REVIEW.md` не
   остаётся PENDING.
4. Все тестовые серверы остановлены после закрытия задания.

## Открытые вопросы

Открытых вопросов нет — все ключевые решения (стек, границы правок, отказ от
новых зависимостей, неприкосновенность контента) подтверждены пользователем.
Условная фаза 4 будет решена оркестратором на основе результатов фазы 1.

План фаз подтверждён пользователем (2026-09-02). Спека заморожена: дальнейшие
правки — только явным решением с пользователем. Исполнение не стартовало
(по решению пользователя) и начинается с фазы 1 по отдельной команде.

---

# Отчёт о выполнении

- Дата закрытия: 2026-09-02
- Коммит: изменения не коммитились (команда пользователя не поступала; правки остались в рабочей копии)

## Итог

Фронтенд-рендеринг статей доведён до читаемого вида: таблицы стилизованы (блок
`.markdown-content` на CSS-токенах тем), подсветка fenced-кода стабилизирована
(CDN-пакеты dockerfile/http + 7 групп алиасов до `highlightAll()`). Приёмка qa:
8/8 критериев PASS (e2e/phase05_acceptance.md); пользователь визуально подтвердил
улучшение таблиц.

## Изменения

- `frontend/src/index.css` → блок `.markdown-content` (27 селекторов: таблицы
  с рамками/зеброй `color-mix`/скруглением, заголовки h1–h6, списки, blockquote,
  inline-code `:not(pre) > code`, hr, img, ссылки) только на существующих
  CSS-переменных тем; `pre` не перекрашен — 15 hljs-тем link-swap не тронуты.
- `frontend/index.html` → два CDN-скрипта `languages/dockerfile.min.js` и
  `languages/http.min.js` (тот же cdn-release@11.12.0, SRI sha384 + crossorigin;
  хэши независимо перепроверены оркестратором).
- `frontend/src/components/MarkdownContent.tsx` → `hljs.registerAliases` до
  `highlightAll()`: env→ini, jinja2/vue→xml, txt/text→plaintext, js/jsx→javascript,
  make→makefile, Dockerfile→dockerfile, toml→ini (решение оркестратора: toml
  отсутствует в hljs 11.12.0, INI структурно близок).
- Контент и зависимости не менялись; `pyproject.toml`, `uv.lock`,
  `frontend/package.json`, `content_art/` задачей не тронуты.

## Критерии успеха

| # | Критерий | Результат | Доказательство |
|---|---|---|---|
| 1 | Таблицы рендерятся и стилизованы | PASS | e2e/phase05_acceptance.md (33/33 статей содержат `<table`; правило `.markdown-content table` с рамками/паддингами в dist-бандле — e2e/phase05_k1_css_evidence.txt) |
| 2 | Подсветка для всех языков статей | PASS | e2e/phase05_acceptance.md (сервер эмитит language-dockerfile/env/jinja2/vue/jsx/http; registerAliases до highlightAll — src/MarkdownContent.tsx:20–28; dist подключает 3 CDN-скрипта с SRI) |
| 3 | Сборка фронтенда без ошибок | PASS | dev/phase05_build.txt (npm run build, exit 0) |
| 4 | Без новых зависимостей | PASS | e2e/phase05_acceptance.md (git diff по pyproject.toml, uv.lock, frontend/package.json пуст) |
| 5 | Контент статей не изменён | PASS | e2e/phase05_acceptance.md (git diff -- content_art/ пуст на момент приёмки; см. примечание ниже) |
| 6 | Счётчик маршрутов не изменился | PASS | e2e/phase01_diagnosis.md (ROUTES_BEFORE=41) и e2e/phase05_acceptance.md (41 после правок) |
| 7 | Регресс базовых эндпоинтов | PASS | e2e/phase05_acceptance.md (/docs, /users/get_all_users, /orders/get_all_orders, /api/v1/dep_examples/single-direct-dependency, /api/blog/articles — все 200; 422 на демо-эндпоинтах без required-параметров — документированная валидация FastAPI, не регресс) |
| 8 | Линтер backend чист | PASS | e2e/phase05_acceptance.md (ruff check — All checks passed) |

## Дефекты

Не найдены — DEFECTS.md не создавался.

## Adversarial-прогон

Не выполнялся — отменён пользователем после фазы 5 до записи первых находок
(«адверсари нам не нужен»); ADVERSARIAL_REVIEW.md не создавался.

## Участники

- qa: фаза 1 — диагностика (33 статьи с таблицами, 33/33 парсятся, ROUTES_BEFORE=41,
  инвентаризация 23 языковых меток); фаза 5 — приёмка 8/8 PASS.
- frontend-dev: фаза 2 — стили `.markdown-content`; фаза 3 — CDN-пакеты и алиасы.
- adversary: прогон запущен и остановлен по решению пользователя, находок не записано.
- оркестратор: ревью диффов фаз, независимая проверка SRI-хэшей, решение toml→ini,
  пропуск фазы 4 (нет непарсящихся таблиц), расследование жалобы «код без подсветки»
  в docx-статьях, архивирование.

## Известные ограничения (не дефекты задания)

- 33 из 71 статьи не содержат ```-fence; 14 из них — конвертаты Word/pandoc
  (сотни литеральных эскейпов `\=`, `\#`, `\_`), код в них — обычные абзацы или
  индент-блоки без метки языка, поэтому подсветка к ним неприменима (пример —
  «Архитектура FastAPI и React», art_id 1788356271). Обсуждено с пользователем;
  конвертация контента — кандидат в отдельное задание (контент в рамках этого
  задания был неприкосновенен).
- Ручной DevTools-прогон предупреждений hljs в браузере агентами не выполнялся
  (браузера нет в окружении); проверено статически: алиасы регистрируются до
  `highlightAll()`, все языковые метки статей покрыты common-бандлом/пакетом/алиасом.
- Примечание к критерию 5: на момент приёмки (фаза 5) diff по `content_art/`
  был пуст. К моменту закрытия в рабочей копии появилась пользовательская правка
  одной статьи (Guide React FastAPI/Архитектура FastAPI и React.md, ~477+/362−) —
  внесена пользователем при просмотре результата, вне рамок задания, не
  откатывалась и не коммитилась.


