# Заведение DEFECTS.md по итогам триажа adversary — задание qa

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Прочитай AGENTS.md (формат DEFECTS.md) и tasks/current/ADVERSARIAL_REVIEW.md
(disposition уже проставлены оркестратором).

Твоя задача — короткий прогон:
1. Воспроизведи три принятые находки adversary на запущенном сервере :8000
   (проверь сначала `curl -m 3 -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/openapi.json`;
   если не отвечает — подними uvicorn сам и оставь работать):
   - DEF-001 (из ADV-001): POST /api/blog/logout без CSRF-заголовка → сейчас 200, по контракту должно быть 403.
   - DEF-002 (из ADV-003): авторизованный multipart POST /api/blog/account с csrf_token и не-изображением (.png-маска, текст внутри) → сейчас 500 (PIL.UnidentifiedImageError), должно быть 422 JSON с errors по полю picture.
   - DEF-003 (из ADV-004): GET /api (без слэша, --path-as-is) → сейчас 200 SPA index.html, должно быть 404 JSON.
   Для авторизации используй своего пользователя (зарегистрируй нового с email вида qa_def@example.com, пароль любой валидный; можно переиспользовать qa08@example.com/Qa08pass! из e2e-заметки фазы 8).
2. Заведи tasks/current/DEFECTS.md (формата AGENTS.md, ровно): три записи DEF-001,
   DEF-002, DEF-003, Status: OPEN, Severity: DEF-001 LOW, DEF-002 MEDIUM, DEF-003 LOW,
   Found by: adversary (ADV-001/ADV-003/ADV-004 соответственно), Task: Миграция блога
   md_articles на React, с шагами воспроизведения, Expected/Actual из записей
   ADVERSARIAL_REVIEW.md, History: «qa: opened».
3. Сырые выводы воспроизведения допиши в tasks/current/e2e/phase08_final.md
   (раздел «adversarial triage repro») или в adv_raw.txt.

Код продукта не исправлять. В чат — вердикты по трём воспроизведениям (подтвердилось/нет)
и подтверждение, что DEFECTS.md создан.
