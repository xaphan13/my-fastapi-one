> Прочитать сначала: `../defix_brief.md` (контракт задания). Назад: `phase06_progress.md`. Вперёд: `phase08_progress.md`.

# phase07_progress.md

# defect fixes (DEF-001..003) — 2026-08-31

- 2026-08-31 — `md_articles/api_blog.py`:
  - `_save_picture`: PIL-блок (open/thumbnail/save) обёрнут в try/except
    (`UnidentifiedImageError` покрыт общим `Exception`), пробрасывается
    `ValueError("Загруженный файл не является изображением.")` — часть DEF-002.
  - `account_post_api`: перехват `ValueError` → 422 `{"errors": {"picture": [...]}}`
    через `_validation_response` — часть DEF-002. Пустой picture по-прежнему валиден
    (условие `if picture and picture.filename` не менялось).
  - Статус: правки внесены, проверка не выполнена.
- 2026-08-31 — `md_articles/api_blog.py`, `logout_api`: добавлен
  `await validate_csrf_header(request)` перед `logout_user` — DEF-001.
  Статус: правка внесена, проверка не выполнена.
- 2026-08-31 — `main.py`, `spa_fallback`: проверка путей заменена на
  `path in ("/api", "api") or startswith("/api/") or startswith("api/")` —
  голый `/api` теперь даёт 404 JSON, не index.html — DEF-003.
  Статус: правка внесена, проверка не выполнена.
- 2026-08-31 — проверки:
  - `uv run ruff check` (2 изменённых файла): All checks passed, exit 0.
  - Счётчик маршрутов: 40 (ожидается).
  - Сервер перезапущен (старый uvicorn PID 1676416/1676418 погашен, поднят свежий
    на :8000, лог /tmp/uvicorn_deffix.log, оставлен работать для qa/adversary).
  - Curl (детали в deffix_raw.txt): (a) logout без CSRF → 403 {"detail":"CSRF
    token mismatch"} — и не залогинен, и с активной сессией после login 200;
  (b) multipart account с не-изображением → 422 {"errors":{"picture":
    ["Загруженный файл не является изображением."]}}; пустой picture → 200 (валиден);
  (c) GET /api и GET /api/ (--path-as-is) → 404 {"detail":"Not Found"}; (d) регресс:
    / → 200 text/html (SPA), GET /api/blog/csrf → 200 (/docs → 200.
  Статус: все три дефекта проверены, checkpoint зелёный.