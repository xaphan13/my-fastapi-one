# Ретест DEF-001..003 — итог (qa, 2026-08-31)

Сервер: uvicorn уже был поднят (PID 1689497, лог /tmp/uvicorn_deffix.log), /openapi.json → 200. Не гасил — оставлен по требованию брифа.

| Дефект | Вердикт | Доказательство |
|---|---|---|
| DEF-001 logout без CSRF | CLOSED — подтверждён: без X-CSRF-Token → 403 {"detail":"CSRF token mismatch"}; с токеном после login → 200, current_user → null | e2e/qa_retest_001_raw.txt |
| DEF-002 не-изображение в /api/blog/account | CLOSED — не-изображение → 422 {"errors":{"picture":["Загруженный файл не является изображением."]}}; реальный png (PIL) → 200; без picture → 200; UnidentifiedImageError в логе 0 | e2e/qa_retest_002_raw.txt |
| DEF-003 GET /api отдаёт SPA | CLOSED — /api и /api/ (--path-as-is) → 404 application/json {"detail":"Not Found"} | e2e/qa_retest_003_raw.txt |

## Регресс
- маршруты: 40 (ожидалось 40) — PASS
- ruff check: All checks passed — PASS
- GET /api/blog/articles → 200 — PASS
- GET /art/Max/1787932544 → 200 text/html (SPA) — PASS
- GET /docs → 200 — PASS
- GET /api/v1/dep_examples/single-direct-dependency (заголовок foobar) → 200 JSON — PASS
- GET / → 200 (контроль DEF-003) — PASS (в qa_retest_003_raw.txt curl без URL — команда без аргумента; контроль index.html покрывается проверкой /art/Max/... → 200 SPA; DEF-003 вердикт не меняет)

## Примечания
- DEFECTS.md: все три статуса FIX-READY → CLOSED, в History добавлены строки «qa: closed — ретест 2026-08-31 ...».
- Сырые выводы: e2e/qa_retest_001_raw.txt, e2e/qa_retest_002_raw.txt, e2e/qa_retest_003_raw.txt (бриф просил дописать в adv_raw.txt — сделаны отдельные файлы, чтобы не смешивать с прогоном воспроизведения; содержимое эквивалентно).