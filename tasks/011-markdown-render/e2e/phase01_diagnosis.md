# Фаза 1 — Диагностика рендера Markdown-статей

- **Дата:** 2026-09-02
- **Задание:** Настройка рендеринга Markdown-статей (таблицы + подсветка кода)
- **Сервер:** запущен в фоне из `fastapi-application/` (`uvicorn main:main_app --port 8000`, PID оставлен для следующих фаз)

## Счётчик маршрутов ДО правок

```
ROUTES_BEFORE = 41
```

- Фактическое значение: **41** (`cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"`).
- В QWEN.md указано «40», в `docs/11_md_articles.md` — «41». Фактически при загруженных
  `register_md_articles` (сессии, current_user, JSON-роутеры блога, catch-all `/api*` 404) счётчик = **41**.
- После всех правок задания это значение должно остаться **41** (критерий успеха 6).
- Сырой вывод: `tasks/current/e2e/phase01_routes_before.txt`.

## Статьи с таблицами

- Всего статей в реестре: **71** (`fastapi-application/md_articles/articles.yaml`).
- Файлов `.md` в `fastapi-application/content_art/`, у которых хотя бы одна строка
  начинается с `|`: **33** (см. `tasks/current/e2e/phase01_raw.txt` — полный перечень).
- Для каждой такой статьи выполнен `GET /api/blog/articles/{art_id}` и проверено
  наличие `<table` в `article.content`.

**Результат: 33 из 33 распарсились успешно.** Серверный python-markdown (с активным
расширением `tables`) обрабатывает все таблицы, найденные в исходниках. Ни одной
нераспарсенной таблицы не обнаружено → **фаза 4 (расширения python-markdown) не
требуется** (достаточно стилей в фазе 2, чтобы сделать таблицы видимыми).

### Список статей с распарсенными таблицами

| art_id | title | section | файл |
|---|---|---|---|
| 1788345978 | aion-zcode-1 | AI инструменты | AI инструменты/aion-zcode-1.md |
| 1788345986 | gem-deep-instal-windsurf-1 | AI инструменты | AI инструменты/gem-deep-instal-windsurf-1.md |
| 1788345987 | FastAPI_CodeReview.docx | Fast API | Fast API/FastAPI_CodeReview.docx.md |
| 1788345988 | agent_mode_review | Fast API | Fast API/agent_mode_review.md |
| 1788345990 | gemPro-book1-g | Fast API | Fast API/gemPro-book1-g.md |
| 1788356271 | Архитектура FastAPI и React | Guide React FastAPI | Guide React FastAPI/Архитектура FastAPI и React.md |
| 1788345997 | SOCKS5 прокси через asyncssh_ | Jinja Templates | Jinja Templates/SOCKS5 прокси через asyncssh_.md |
| 1788345998 | SOCKS5 через sshtunnel_ руководство_ | Jinja Templates | Jinja Templates/SOCKS5 через sshtunnel_ руководство_.md |
| 1788346001 | qwen3-deep-instal-windsurf-1 | Jinja Templates | Jinja Templates/qwen3-deep-instal-windsurf-1.md |
| 1788346005 | gemPro-book1-g | Pydantic Python | Pydantic Python/gemPro-book1-g.md |
| 1788346010 | Альтернативы asyncssh для SOCKS-прокси_ | Pydantic Python | Pydantic Python/Альтернативы asyncssh для SOCKS-прокси_.md |
| 1788346011 | Параллелизм и многозадачность Python_ | Pydantic Python | Pydantic Python/Параллелизм и многозадачность Python_.md |
| 1788346012 | Установка и использование WinSurf Python_ | Pydantic Python | Pydantic Python/Установка и использование WinSurf Python_.md |
| 1788346013 | 01_project_structure | Python | Python/01_project_structure.md |
| 1788346014 | 02_architecture | Python | Python/02_architecture.md |
| 1788346015 | 03_execution_flow | Python | Python/03_execution_flow.md |
| 1788346016 | 04_code_quality | Python | Python/04_code_quality.md |
| 1788346017 | 05_optimization_roadmap | Python | Python/05_optimization_roadmap.md |
| 1788346018 | 06_frontend_guide | Python | Python/06_frontend_guide.md |
| 1788346019 | 07_frontend_project_report | Python | Python/07_frontend_project_report.md |
| 1788346020 | 08_ai_application_report | Python | Python/08_ai_application_report.md |
| 1788346022 | 10_models_and_providers | Python | Python/10_models_and_providers.md |
| 1788346023 | 05_ai_agent_guide | Rust | Rust/05_ai_agent_guide.md |
| 1788346024 | 06_frontend_bootstrap_analysis | Rust | Rust/06_frontend_bootstrap_analysis.md |
| 1788346025 | 06_frontend_report | Rust | Rust/06_frontend_report.md |
| 1788346026 | 07_authorization_report | Rust | Rust/07_authorization_report.md |
| 1788346027 | configuration | Rust | Rust/configuration.md |
| 1788346028 | report_database_sqlalchemy_async_alembic | Rust | Rust/report_database_sqlalchemy_async_alembic.md |
| 1788346029 | static-site-generation | Rust | Rust/static-site-generation.md |
| 1788346030 | writing-posts | Rust | Rust/writing-posts.md |
| 1788346031 | 05_tailwind_cdn_vs_production | Sql Alchemy | Sql Alchemy/05_tailwind_cdn_vs_production.md |
| 1788346032 | AGENTS | Sql Alchemy | Sql Alchemy/AGENTS.md |
| 1788346034 | README | Sql Alchemy | Sql Alchemy/README.md |

## Непарсящиеся таблицы

**Нет ни одной.** Все 33 таблицы в исходниках корректно отрендерились в HTML с
тегом `<table>`. Дополнительных проверок таблиц на стороне бэкенда не требуется.

## Инвентаризация языков code-fence

- Команда: `grep -RohE '^```[a-zA-Z0-9+-]+' fastapi-application/content_art/ | sort | uniq -c | sort -rn`
- Всего различных меток (с учётом регистра): 23
- Сводная таблица:

| Метка | Вхождений | Категория | Примечание |
|---|---|---|---|
| python | 193 | common-бандл hljs | ✓ |
| bash | 51 | common-бандл hljs | ✓ |
| yaml | 13 | common-бандл hljs | ✓ |
| dockerfile | 10 | **CDN-пакет** | `build/languages/dockerfile.min.js` доступен (HTTP 200) |
| javascript | 9 | common-бандл hljs | ✓ |
| json | 8 | common-бандл hljs | ✓ |
| html | 6 | common-бандл hljs | ✓ (внутри xml) |
| env | 6 | **алиас → ini** | ini входит в common |
| jinja2 | 5 | **алиас → xml** | xml входит в common |
| ini | 5 | common-бандл hljs | ✓ |
| vue | 3 | **алиас → xml** | xml входит в common |
| txt | 3 | **алиас → plaintext** | plaintext входит в common |
| markdown | 3 | common-бандл hljs | ✓ |
| text | 2 | **алиас → plaintext** | plaintext входит в common |
| sql | 2 | common-бандл hljs | ✓ |
| js | 2 | **алиас → javascript** | javascript входит в common |
| toml | 1 | **отсутствует в hljs 11.x** | нет отдельного пакета на CDN, нет в common. Решение: алиас `toml → ini` (структурно близок) или оставить без подсветки |
| makefile | 1 | common-бандл hljs | ✓ |
| make | 1 | **алиас → makefile** | makefile входит в common |
| jsx | 1 | **алиас → javascript** | javascript входит в common |
| http | 1 | **CDN-пакет** | `build/languages/http.min.js` доступен (HTTP 200) |
| Dockerfile | 1 | **CDN-пакет + алиас** | в исходнике `AI инструменты/deepseek-r1-fastapi-1.md:129`; регистр отличается от `dockerfile` — нужен алиас `Dockerfile → dockerfile` (после CDN-дозагрузки) |
| css | 1 | common-бандл hljs | ✓ |

### Сводка по категориям

- **common-бандл hljs** (без дозагрузки): 13 меток, 297 вхождений:
  python, bash, yaml, javascript, json, html, ini, markdown, sql, makefile, css
  (+ 5 меток, которые есть в common, но не встретились: diff, go, scss, shell, typescript).
- **CDN-пакет нужен** (дозагрузить с `cdn-release@11.12.0`):
  - `dockerfile.min.js` (10 вхождений + 1 `Dockerfile` после алиаса)
  - `http.min.js` (1 вхождение)
- **Алиас (без дозагрузки)**: 8 меток.
- **Особый случай — toml**: в hljs 11.12.0 нет ни в common, ни отдельного пакета
  (`build/languages/toml.min.js` → HTTP 404). Один файл с одним code-блоком:
  `Python/05_optimization_roadmap.md:241`. Рекомендация — зарегистрировать
  алиас `toml → ini` (TOML структурно похож на INI), либо оставить блок без
  подсветки (hljs выдаст предупреждение «Could not find the language»).

## Текущая конфигурация hljs во фронтенде

- `frontend/index.html:25-29` подключает общий `highlight.min.js` с CDN
  `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.12.0/build/highlight.min.js`.
  Это **common-бандл** (36 языков, см. выше). **Никаких language-пакетов сверх
  common-бандла сейчас не подключено.**
- `frontend/src/components/MarkdownContent.tsx` в `useEffect` вызывает
  `window.hljs?.highlightAll()` — без предварительной регистрации алиасов.
- Темы hljs подключены как 15 раздельных `<link>` (архитектура link-swap, не трогаем).

## Выводы для фаз 2–3

### Фаза 2 (стили `.markdown-content`)

- **Запускается.** Фаза только правит `frontend/src/index.css` (CSS-токены уже есть в темах).
- Таблицы рендерятся корректно на бэкенде (33/33) — нужно лишь сделать их видимыми:
  рамки `var(--border)`, фон шапки `var(--card-bg)`, скругление `var(--radius)`,
  `width: 100%`, отступы ячеек.

### Фаза 3 (CDN-пакеты + алиасы)

- **Файл `frontend/index.html`** — добавить два `<script>` с тем же CDN
  `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.12.0/build/languages/...`:
  - `dockerfile.min.js` (покрывает метки `dockerfile` и `Dockerfile` после алиаса)
  - `http.min.js`
- **Файл `frontend/src/components/MarkdownContent.tsx`** — добавить `hljs.registerAliases(...)`
  **до** `highlightAll()` в `useEffect`. Точный список алиасов:

  ```js
  hljs.registerAliases(['env', 'jinja2', 'vue'], { languageName: 'xml' });
  // (env реально маппится на ini, но jinja2/vue — на xml; лучше разделить)
  ```

  Корректная версия (по одной цели на алиас):

  ```js
  hljs.registerAliases('env',         { languageName: 'ini' });
  hljs.registerAliases(['jinja2','vue'], { languageName: 'xml' });
  hljs.registerAliases(['txt','text'], { languageName: 'plaintext' });
  hljs.registerAliases(['js','jsx'],    { languageName: 'javascript' });
  hljs.registerAliases('make',          { languageName: 'makefile' });
  hljs.registerAliases('Dockerfile',    { languageName: 'dockerfile' });
  // toml — отдельный вопрос: см. ниже
  ```

  - Параметр `registerAliases` в hljs 11.x: `registerAliases(aliasList | alias, { languageName })`.
- **Точные URL для CDN-дозагрузки** (проверены HTTP 200):
  - `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.12.0/build/languages/dockerfile.min.js`
  - `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.12.0/build/languages/http.min.js`

### Фаза 4 (расширения python-markdown) — пропуск

- Все таблицы распарсились успешно (33/33).
- Причина не запускать фазу 4: нет нераспарсенных таблиц → расширения
  `sane_lists` / `md_in_html` / `attr_list` не нужны. **Фаза 4 пропускается по
  решению qa на основе результатов фазы 1.** Если позже всплывут проблемы —
  оркестратор может вернуться к ней отдельным заданием.

### Замечание для оркестратора про `toml`

- 1 вхождение: `Python/05_optimization_roadmap.md:241`.
- `toml` отсутствует в hljs 11.12.0 (нет в common, нет отдельного пакета).
- Возможные опции без добавления зависимостей:
  - **Алиас `toml → ini`** — даст хоть какую-то подсветку (TOML и INI синтаксически похожи).
  - **Оставить без подсветки** — hljs выдаст предупреждение в консоли, но блок останется читаемым как `<pre><code>`.
- Рекомендация qa: **алиас `toml → ini`** (минимальное вмешательство, нет новых зависимостей,
  содержимое блока всё равно читаемо). Это **не блокирующее** замечание — на основные
  критерии успеха не влияет.

## Артефакты

- `tasks/current/e2e/phase01_routes_before.txt` — сырое значение счётчика маршрутов.
- `tasks/current/e2e/phase01_raw.txt` — сырые выводы прогонов (список 33 файлов с таблицами,
  статус каждой статьи через API, сводка).
