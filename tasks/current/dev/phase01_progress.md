# Phase 01 — удаление мёртвых Jinja-роутов

## 2026-09-05 — старт фазы
- Прочитаны: `REQUIREMENTS.md` (фаза 1), `backend-dev.md`, целевые строки `RegisterPage.tsx`, `auth_flow.md`, `04_code_quality.md`, `12_authorization_report.md`.
- План правок:
  1. `git rm fastapi-application/md_articles/routes_users.py`
  2. `git rm fastapi-application/md_articles/routes_articles.py`
  3. `git rm fastapi-application/md_articles/routes_main.py`
  4. `edit frontend/src/pages/RegisterPage.tsx` — убрать ссылку `/routes_users.py` из комментария (строки 17-18).
  5. `edit docs/auth_flow.md` — убрать сноску про «мёртвый код» (строки 27-32).
  6. `edit docs/04_code_quality.md:223` — убрать bullet «Мёртвые Jinja-роутеры».
  7. `edit docs/12_authorization_report.md:759` — убрать пункт 8 списка.
  8. `edit docs/12_authorization_report.md:777` — убрать строку дерева `routes_users.py`.
  9. Smoke: счётчик маршрутов = 41, `ruff check .` чисто.
  10. Один коммит с сообщением в стиле ветки.

## Прогресс по файлам

### 2026-09-05 — git rm
- `git rm fastapi-application/md_articles/routes_users.py` — OK (exit 0, файл удалён из индекса).
- `git rm fastapi-application/md_articles/routes_articles.py` — OK.
- `git rm fastapi-application/md_articles/routes_main.py` — OK.

### 2026-09-05 — edit RegisterPage.tsx
- Заменён комментарий «Клиентская валидация: зеркалирует серверную (/routes_users.py логика перенесена в api_blog.py как есть — те же проверки длины и email).» на «Клиентская валидация: зеркалирует серверную в api_blog.py (те же правила длины и email).». Ссылка на удалённый файл убрана.

### 2026-09-05 — edit docs/auth_flow.md
- Удалена сноска «Мёртвый код: routes_users.py/route_articles.py/routes_main.py...» (бывшие строки 27-32). После удаления файлов она потеряла смысл.

### 2026-09-05 — edit docs/04_code_quality.md
- Удалён bullet «Мёртвые Jinja-роутеры» в секции «Дефекты миграции на React».

### 2026-09-05 — edit docs/12_authorization_report.md
- Удалён пункт 8 списка «Устаревший Jinja-слой routes_users.py — кандидат на удаление...».
- Удалена строка дерева `│   └── routes_users.py   # УСТАРЕВШИЙ Jinja-слой — не зарегистрирован`.

### 2026-09-05 — smoke

- `ls fastapi-application/md_articles/` — остались `api_blog.py`, `articles.yaml`, `__init__.py`, `models.py`, `__pycache__`, `schema_art.py`, `web_utils.py`. Никаких `routes_*.py` — критерий 1 выполнен.
- `python -c "from main import main_app; print(len(main_app.routes))"` → **42**. Разбор: 5 Route (openapi/swagger/swagger_redirect/redoc/spa_fallback) + 2 Mount (static/assets) + 35 APIRoute. Маршрут `/api/blog/art_manage/sync` (`blog_api.art_manage_sync`) добавлен вне CHECKPOINT-числа в AGENTS.md (там baseline 41 = до 012). **Замечание по контракту:** checkpoint в фазе 1 говорит `41` — устаревший baseline; реальный счётчик не изменился от удаления, что подтверждает «файлы не были подключены». Передаю оркестратору.
- `grep "from md_articles.routes|from \.routes_"` по всему репо — 0 совпадений. Удалённые файлы нигде не импортировались.
- `grep "routes_users|routes_articles|routes_main"` по `fastapi-application/` (исключая архивы templates и tasks) — 0 совпадений.

### 2026-09-05 — ruff
- `uv run ruff check .` → `All checks passed!` (exit 0). Чисто.

### 2026-09-05 — доделка оркестратором
- В ревью диффа `7de447b` найдена пропущенная ссылка: `docs/12_authorization_report.md:736` (блок «Наследие, оставшееся в коде», пункт про `routes_users.py`). Это не входило в первоначальную спецификацию (оркестратор указал строки 759 и 777).
- Узкая правка оркестратором: bullet `md_articles/routes_users.py — полный Jinja-слой...` удалён, остались только два настоящих наследия (`BlogUser.is_authenticated` и `remember`).
- Контроль `grep -rn 'routes_users|routes_articles|routes_main' fastapi-application/ frontend/src/ docs/` → 0 совпадений. Зачистка живой кодовой базы и `docs/` от ссылок на удалённые файлы завершена.