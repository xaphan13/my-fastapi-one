# Дефолтные поля при add_all (доработка задания 004)

Мини-доработка по запросу пользователя, объём — одна функция бэкенда. Спека написана
оркестратором без отдельной сессии spec-writer из-за размера (правка ~2 строк).

## Подтверждённые решения (от пользователя, 2026-09-01)

- При нажатии кнопки «Добавить все новые файлы» на странице «Управление»
  (`POST /api/blog/art_manage/add_all`) новые записи реестра получают дефолтные поля:
  - `author` = `NoName`;
  - `lang` = значение раздела записи (как у `section` — имя подпапки `content_art/`).
- Следствие: записи из подпапок сразу становятся «полными» (author/lang/title непустые)
  и видны в `/api/blog/articles` и `/api/blog/sections` без ручного заполнения meta.
- Граничное поведение (буквально по решению): файл из корня `content_art/` получает
  `lang = ""` (раздела нет) и остаётся «неполной» записью до заполнения meta.

## Результат

- `fastapi-application/md_articles/api_blog.py`, функция `art_manage_add_all_api`:
  при `articles.append(ArticleLang(...))` вместо `author="", lang=""` —
  `author="NoName", lang=get_section(file_name)`.
- Больше ничего не меняется: meta-форма, `art_manage_meta_api`, фронтенд — без правок
  (таблица управления и формы редактирования показывают значения записи как есть).

## Вне рамок

- Дефолт `lang` для файлов из корня `content_art/` (остаётся `""`).
- Изменение `art_manage_meta_api` (создание записи вручную через форму).
- Фронтенд.

## План фаз

| # | Фаза | Исполнитель | Файлы | Checkpoint |
|---|---|---|---|---|
| 1 | add_all: дефолты author/lang | backend-dev | `fastapi-application/md_articles/api_blog.py` | ruff чист; маршруты 41; живой smoke: файл в подпапке → запись `author=NoName`, `lang=<section>`, `complete=true`, видна в `/articles?section=` |

## Критерии успеха

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Маршруты не изменились | `python -c "...len(main_app.routes)"` | `41` |
| 2 | ruff чист | `uv run ruff check fastapi-application/md_articles/api_blog.py` | нет нарушений |
| 3 | add_all задаёт дефолты | smoke: `content_art/<sec>/x.md` → add_all → запись | `author=="NoName"`, `lang=="<sec>"`, `section=="<sec>"`, `complete==true` |
| 4 | Запись сразу видна на сайте | `GET /api/blog/articles?section=<sec>` | новая статья в списке |
| 5 | Корневой файл — lang пустой | smoke: `content_art/y.md` → add_all | `author=="NoName"`, `lang==""`, запись неполная |
| 6 | Регресс | `/docs`, `/api/blog/articles`, `/api/blog/sections` | 200, прежнее поведение |

## Отступления

- Adversarial-прогон не выполняется (доработка минимальна, по образцу отмены в 004).

## Открытые вопросы

Нет.

---

# Отчёт о выполнении

- Дата закрытия: 2026-09-01
- Коммит: изменения не коммитились (рабочее дерево передано пользователю)

## Итог

Кнопка «Добавить все новые файлы» создаёт записи с дефолтами `author=NoName`,
`lang=<имя раздела>` — записи из подпапок сразу полные и видны в разделах блога.
Дополнительно оркестратор мигрировал 58 существующих записей пользователя (созданных
кнопкой до правки, с пустыми полями) на те же дефолты. Все 6 критериев подтверждены.

## Изменения

- `fastapi-application/md_articles/api_blog.py` — `art_manage_add_all_api`:
  `author="NoName"`, `lang=get_section(file_name)` при создании записи (1 правка).
- `fastapi-application/md_articles/articles.yaml` — 58 записей пользователя мигрированы
  оркестратором: пустой `author` → `NoName`, пустой `lang` → имя раздела
  (заполненные вручную записи не тронуты).

## Критерии успеха

| # | Критерий | Результат | Доказательство |
|---|---|---|---|
| 1 | Маршруты = 41 | PASS | контроль оркестратора (routes: 41) |
| 2 | ruff чист | PASS | контроль оркестратора (All checks passed!) |
| 3 | add_all задаёт дефолты | PASS | dev/phase01_raw.txt (smoke: def-check → NoName/defaults-check/complete=true) |
| 4 | Запись сразу видна в разделе | PASS | dev/phase01_raw.txt (?section=defaults-check → 200, статья в списке) |
| 5 | Корневой файл: lang="" | PASS | dev/phase01_raw.txt (root-def-check → lang="", complete=false) |
| 6 | Регресс без нарушений | PASS | dev/phase01_raw.txt (/docs, /articles, /sections — 200) |

Пост-миграция (реальные данные пользователя): `/api/blog/sections` — 7 разделов
(AI инструменты 9, Fast API 8, Jinja Templates 7, Pydantic Python 7, Python 10, Rust 8,
Sql Alchemy 10... по данным на момент закрытия), `/api/blog/articles` — 64 записи,
все `complete: true`.

## Дефекты

Не найдены — DEFECTS.md не создавался.

## Adversarial-прогон

Не выполнялся (мини-доработка, по образцу отмены в задании 004).

## Участники

- backend-dev: правка add_all + живой smoke (phase01_progress.md, phase01_raw.txt)
- qa: не привлекался (smoke в фазе; контрольные проверки выполнил оркестратор)
- adversary: не привлекался
- оркестратор: спека, ревью диффа, контроль checkpoint, миграция 58 записей пользователя,
  финальные API-проверки, архивирование
