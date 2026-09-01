# Поддержка разделов статей блога (подпапки `content_art`)

Сейчас статьи блога лежат плоским списком в `fastapi-application/content_art/`, а левое меню React SPA — статический набор кнопок. Нужно, чтобы подпапки `content_art/` становились разделами: каждая подпапка — пункт меню слева, пункт «Все статьи» показывает статьи из всех разделов (и из корня).

## Подтверждённые решения

- Подпапка непосредственно внутри `content_art/` = один раздел блога.
- Обязательный пункт меню «Все статьи» возвращает пользователя на общий список статей.
- Раздел статьи хранится в реестре `articles.yaml` в поле `section` (пустая строка для статей в корне `content_art/`).
- Имя раздела = имя папки; отображаемое имя в меню = имя папки; сортировка разделов по алфавиту имени папки.
- Раздел вычисляется автоматически при `add_all` из относительного пути файла; ручное управление разделами через UI не добавляется.
- Фильтрация списка статей по разделу — через query-параметр `section` в `GET /api/blog/articles` (например, `?section=python`).
- Список разделов отдаётся отдельным endpoint `GET /api/blog/sections`.
- Фронтенд использует отдельный маршрут `/section/<name>` (React Router): клик по разделу ведёт на `/section/<name>`, кнопка «Все статьи» — на `/`.
- Статьи в корне `content_art/` видны только в «Все статьи»; пункта «Без раздела» в меню нет.
- Вложенность глубже одного уровня: файл `content_art/a/b/c.md` получает раздел `a`, `file_name` — полный относительный путь.
- Ссылка на раздел из карточки/страницы статьи не добавляется — навигация через левое меню.

## Результат

После задания в репозитории:

- В `fastapi-application/md_articles/schema_art.py`:
  - у `ArticleLang` появляется поле `section: str = ""`;
  - в `_FIELDS_FOR_YAML` добавляется `"section"`;
  - `scan_content_art()` рекурсивно сканирует `content_art/` и возвращает относительные POSIX-пути `.md`-файлов;
  - появляется хелпер для получения раздела из относительного пути.
- В `fastapi-application/md_articles/api_blog.py`:
  - новый endpoint `GET /api/blog/sections`;
  - `GET /api/blog/articles` принимает необязательный query-параметр `section` и фильтрует по нему;
  - `_article_summary` включает `section`;
  - `add_all` корректно заполняет `section` и title (без префикса папки);
  - `art_manage` и `art_manage/meta` сохраняют/вычисляют `section`.
- Во фронтенде:
  - `frontend/src/types.ts` — тип `Section` и поле `section` в `Article`;
  - `frontend/src/api/blog.ts` — `getSections()` и `getArticles(section?)`;
  - `frontend/src/components/SectionMenu.tsx` — новое левое меню разделов;
  - `frontend/src/components/Layout.tsx` — использует `SectionMenu` вместо статических кнопок;
  - `frontend/src/App.tsx` — маршрут `/section/:name` (тот же компонент `HomePage`);
  - `frontend/src/pages/HomePage.tsx` — читает имя раздела из `useParams` и запрашивает соответствующий список;
  - `frontend/src/index.css` — стиль активного пункта меню.

## Вне рамок

- Вложенность глубже одного уровня (`content_art/a/b/c.md`) — не поддерживается; такие файлы, если попадутся, получат раздел `a`, а `file_name` останется полным относительным путём.
- CRUD разделов через UI, переименование разделов, перемещение статей между разделами.
- Отдельное «человеческое» отображаемое имя раздела вместо имени папки.
- Изменение маршрута детальной страницы статьи (`/art/:author/:artId`).
- Авторизация, регистрация, темы, подсветка кода, аватары.
- Запуск тестов (в проекте их нет).
- Обновление документации в `docs/`.

## План фаз

| # | Фаза | Исполнитель | Файлы | Контракт | Checkpoint | Бюджет ходов |
|---|---|---|---|---|---|---|
| 1 | Backend: реестр и сканирование подпапок | backend-dev | `fastapi-application/md_articles/schema_art.py` | `ArticleLang.section: str = ""`; `scan_content_art()` возвращает относительные POSIX-пути; `_FIELDS_FOR_YAML` включает `section`; хелпер `get_section(path) -> str` | `ruff check .` чист; импорт `main` не падает; счётчик маршрутов остаётся 40 | ~10 |
| 2 | Backend: API разделов и фильтрация | backend-dev | `fastapi-application/md_articles/api_blog.py` | `GET /api/blog/sections -> {"sections": [{"name": "...", "label": "...", "count": N}]}`; `GET /api/blog/articles?section=...`; summary содержит `section`; `add_all`/`meta` работают с подпапками | `ruff check .` чист; счётчик маршрутов = 41; `curl /api/blog/sections` 200 с ожидаемой формой | ~12 |
| 3 | Frontend: типы, API и компонент меню | frontend-dev | `frontend/src/types.ts`, `frontend/src/api/blog.ts`, `frontend/src/components/SectionMenu.tsx` | `Section` и `section` в `Article`; `getSections()` / `getArticles(section?)`; `SectionMenu` строит ссылки `/` и `/section/<name>` через `NavLink` | `npm run build` без ошибок; линтер/TypeScript не падает | ~10 |
| 4 | Frontend: подключение меню и фильтрация главной страницы | frontend-dev | `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`, `frontend/src/pages/HomePage.tsx`, `frontend/src/index.css` | Маршрут `/section/:name`; `Layout` рендерит `<SectionMenu />`; `HomePage` читает имя раздела из `useParams` и запрашивает фильтрованный список; активный пункт меню визуально выделен | `npm run build` без ошибок; в dev-режиме меню и фильтрация работают | ~12 |

### Фаза 1: Backend — реестр и сканирование подпапок

- Файлы: `fastapi-application/md_articles/schema_art.py`
- Контракт:
  - `ArticleLang` получает поле `section: str = ""`.
  - `_FIELDS_FOR_YAML = {"author", "lang", "art_id", "title", "file_name", "section"}`.
  - `scan_content_art()` возвращает отсортированный список относительных POSIX-путей всех `.md`/`.markdown` файлов в `content_art/` (рекурсивно, первый уровень = раздел).
  - Новый хелпер `get_section(file_name: str) -> str`: первая компонента пути или `""`.
  - `render_article`/`read_html` продолжают работать с путями, содержащими `/` (через `Path`).
- Шаги:
  1. Добавить поле `section` в `ArticleLang`.
  2. Добавить `"section"` в `_FIELDS_FOR_YAML`.
  3. Переписать `scan_content_art()` на рекурсивный обход.
  4. Добавить и использовать `get_section()`.
  5. Убедиться, что YAML без поля `section` загружается корректно (default).
- Checkpoint:
  - `cd /home/max/0_0_26_new_one/my-fastapi-one && uv run ruff check fastapi-application/md_articles/schema_art.py` — чисто.
  - `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` — `40`.
  - `cd fastapi-application && ../.venv/bin/python -c "from md_articles.schema_art import ArticleLang, get_section; a=ArticleLang(art_id=1,title='t',lang='ru',file_name='python/foo.md'); print(a.section, get_section('python/foo.md'))"` — вывод `python python`.

### Фаза 2: Backend — API разделов и фильтрация

- Файлы: `fastapi-application/md_articles/api_blog.py`
- Контракт:
  - Новый pydantic-класс `SectionOut` (поля `name`, `label`, `count`).
  - `GET /api/blog/sections` — список непустых разделов с количеством полных статей, отсортированных по `name`.
  - `GET /api/blog/articles` — query-параметр `section: str | None`; если задан, возвращает только полные статьи с `section == section`; если не задан — все полные статьи.
  - `_article_summary` добавляет `section` в ответ.
  - `art_manage_add_all_api` при добавлении файла вычисляет `section` и title = `Path(file_name).stem` (без папки и расширения).
  - `art_manage_meta_api` сохраняет существующий `section` при обновлении и вычисляет `section` при создании новой записи.
  - `art_manage_api` возвращает `section` в каждой записи; `unassigned_files` содержит относительные пути.
- Шаги:
  1. Добавить `SectionOut`.
  2. Добавить `/sections` роут.
  3. Модифицировать `/articles` для параметра `section`.
  4. Обновить `_article_summary`, `add_all`, `meta`, `art_manage`.
- Checkpoint:
  - `uv run ruff check fastapi-application/md_articles/api_blog.py` — чисто.
  - `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` — `41`.
  - Поднять сервер, создать временную подпапку `content_art/test-section/` с `.md`-файлом, через `POST /api/blog/art_manage/add_all` (авторизованный запрос) зарегистрировать файл, проверить:
    - `GET /api/blog/sections` содержит `test-section`;
    - `GET /api/blog/articles?section=test-section` возвращает только статьи этого раздела;
    - `GET /api/blog/articles` возвращает и корневые, и разделённые статьи.
  - Удалить временные тестовые файлы и запись из `articles.yaml` после проверки.

### Фаза 3: Frontend — типы, API и компонент меню

- Файлы:
  - `frontend/src/types.ts`
  - `frontend/src/api/blog.ts`
  - `frontend/src/components/SectionMenu.tsx` (новый)
- Контракт:
  - `Section`:
    ```ts
    export interface Section {
      name: string;
      label: string;
      count: number;
    }
    ```
  - `Article` получает `section?: string`.
  - `getSections(): Promise<{ sections: Section[] }>`.
  - `getArticles(section?: string): Promise<{ articles: Article[] }>` (передаёт query-параметр, если задан).
  - `SectionMenu`:
    - загружает разделы через `getSections`;
    - использует `NavLink` (react-router-dom);
    - первый пункт «Все статьи» (`to="/"`);
    - остальные пункты — разделы, `to="/section/<name>"`;
    - активный пункт определяется по текущему маршруту (`/section/<name>` или `/`).
- Шаги:
  1. Обновить `types.ts`.
  2. Добавить функции в `api/blog.ts`.
  3. Создать `SectionMenu.tsx`.
- Checkpoint:
  - `cd frontend && npm run build` — без ошибок.
  - `cd frontend && npx tsc --noEmit` — без ошибок (если доступен).

### Фаза 4: Frontend — подключение меню и фильтрация главной страницы

- Файлы:
  - `frontend/src/App.tsx`
  - `frontend/src/components/Layout.tsx`
  - `frontend/src/pages/HomePage.tsx`
  - `frontend/src/index.css`
- Контракт:
  - `App.tsx`: новый маршрут `<Route path="/section/:name" element={<HomePage />} />` рядом с `/`.
  - `Layout` вместо статического `<aside>` с кнопками рендерит `<SectionMenu />` (тот же контейнер `left-menu`).
  - `HomePage`:
    - читает имя раздела из `useParams` (`:name`; отсутствие параметра = все статьи);
    - вызывает `getArticles(section || undefined)`;
    - заголовок страницы: «Все статьи» или «Статьи раздела «{name}»»;
    - при пустом результате показывает «В этом разделе пока нет статей.»
  - `index.css` добавляет `.menu-item.active` (выделение активного пункта, не конфликтует с hover).
- Шаги:
  1. Добавить маршрут `/section/:name` в `App.tsx`.
  2. Заменить статическое меню в `Layout.tsx` на `<SectionMenu />`.
  3. Добавить чтение `useParams` и фильтрацию в `HomePage.tsx`.
  4. Добавить стиль `.menu-item.active` в `index.css`.
- Checkpoint:
  - `cd frontend && npm run build` — без ошибок.
  - В dev-режиме (`npm run dev` + бэкенд на 8000) меню отображает разделы, клик переключает список статей, «Все статьи» возвращает полный список.

## Критерии успеха

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Backend не нарушает существующие маршруты | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` | `41` |
| 2 | Backend чист по ruff | `uv run ruff check fastapi-application/md_articles/schema_art.py fastapi-application/md_articles/api_blog.py` | нет нарушений |
| 3 | API отдаёт список разделов | `curl -s http://127.0.0.1:8000/api/blog/sections` | `200`, JSON с полем `sections` массива объектов `{name, label, count}` |
| 4 | API фильтрует статьи по разделу | `curl -s "http://127.0.0.1:8000/api/blog/articles?section=<existing-section>"` | только статьи с `section == <existing-section>` и `complete == true` |
| 5 | API возвращает все статьи без параметра | `curl -s http://127.0.0.1:8000/api/blog/articles` | все полные статьи, в том числе с непустым `section` |
| 6 | `add_all` корректно регистрирует файлы из подпапок | Авторизованный `POST /api/blog/art_manage/add_all` после добавления `.md` в `content_art/<section>/` | новая запись имеет `section == "<section>"` и title без префикса папки |
| 7 | `art_manage` видит разделы и относительные пути | `curl -s http://127.0.0.1:8000/api/blog/art_manage` (авторизованный) | записи содержат `section`, `unassigned_files` содержит относительные пути |
| 8 | Фронтенд собирается | `cd frontend && npm run build` | завершается без ошибок |
| 9 | Меню отображает разделы и «Все статьи» | Просмотр `/` в dev/прод-сборке | в левом меню есть «Все статьи» и кнопки для каждой подпапки `content_art/` |
| 10 | Выбор раздела фильтрует статьи | Клик по разделу в меню | URL меняется на `/section/<name>`, страница показывает статьи только этого раздела |
| 11 | «Все статьи» сбрасывает фильтр | Клик по «Все статьи» | URL `/`, список содержит все статьи |
| 12 | Активный пункт меню выделен | Визуальная проверка | у текущего раздела/«Все статьи» применяется класс `.active` |

## Финальные критерии

1. Все критерии успеха подтверждены доказательствами (выводы curl, заметки в `tasks/current/e2e/`).
2. `tasks/current/DEFECTS.md` существует только если найдены дефекты; все записи не в статусе `OPEN`.

## Отступление от стандартного цикла

Adversarial-прогон для этого задания отменён по решению пользователя — ADVERSARIAL_REVIEW.md не создаётся.

## Открытые вопросы

Нет — все закрыты до старта исполнения и перенесены в «Подтверждённые решения».
