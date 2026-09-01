# Phase 01 progress — дефолтные поля в art_manage_add_all_api

- Дата: 2026-09-01
- Задание: доработка 004, дефолты author/lang при add_all
- Исполнитель: backend-dev
- Файл правки: `fastapi-application/md_articles/api_blog.py`

## План
1. Точечный edit `fastapi-application/md_articles/api_blog.py`: в `art_manage_add_all_api` заменить `author="", lang=""` на `author="NoName", lang=get_section(file_name)`. `get_section` уже импортирован.
2. ruff + проверка `len(main_app.routes) == 41`.
3. Живой smoke: register/login → создать два .md (в подпапке и в корне) → add_all → проверить `art_manage` и `/articles?section=`.
4. Очистка артефактов, `git status` — ожидаемо.

## Прогресс
- [x] edit api_blog.py — заменено `author="", lang=""` на `author="NoName", lang=get_section(file_name)`
- [x] ruff clean — `All checks passed!` (exit 0)
- [x] route count 41
- [x] smoke register/login/add_all/art_manage/articles
- [x] cleanup + git status

## Результаты

### Checkpoint
- `uv run ruff check fastapi-application/md_articles/api_blog.py` → All checks passed! (exit 0)
- `python -c "from main import main_app; print(len(main_app.routes))"` → 41

### Smoke (живой uvicorn на 127.0.0.1:8000)
- register `smoke@example.com`: 200 success
- login: 200 success, выдан session cookie
- CSRF через `GET /api/blog/csrf`: ok
- `content_art/defaults-check/def-check.md` (подпапка) + `content_art/root-def-check.md` (корень)
- `GET /art_manage` до add_all: unassigned_files = оба файла присутствуют
- `POST /art_manage/add_all`: `Добавлено файлов: 2` (success)
- `GET /art_manage` после: для подпапки — `author=NoName, lang=defaults-check, section=defaults-check, complete=true`; для корня — `author=NoName, lang="", complete=false`
- `GET /api/blog/articles?section=defaults-check`: новая статья отображается (200)

### Регресс
- /docs: 200
- /api/blog/articles: 200, 6 полных
- /api/blog/sections: 200
- /api/blog/articles?section=defaults-check (после очистки): 200

### Очистка
- Удалён `content_art/defaults-check/` (def-check.md и сама папка)
- Удалён `content_art/root-def-check.md`
- Из `articles.yaml` удалены 2 тестовые записи (art_id 1788285707, 1788285708) — состояние yaml идентично тому, что было до smoke (`diff /tmp/articles_after_smoke.yaml` показал только эти 2 удаления)
- `content_art/{AI инструменты,Fast API,...}` и `default.jpg` и пр. — преэкзистующие артефакты предыдущих заданий, не мои

### git status
Пост-очистка `git status --short` показывает только преэкзистующие изменения других разработчиков (frontend/, schema_art.py, REQUIREMENTS.md, content_art/* — пришли от других фаз) плюс мои:
- `M fastapi-application/md_articles/api_blog.py` — моя целевая правка (видна в `git diff`)
- `?? tasks/current/dev/phase01_progress.md`, `?? tasks/current/dev/phase01_raw.txt`
- `M fastapi-application/md_articles/articles.yaml` — дифф тот же, что до моего smoke (мои 2 записи удалены полностью)
