# Фаза 6: Управление реестром art_manage — задание frontend-dev

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Спецификация фазы — в REQUIREMENTS.md, секция «Фаза 6: Управление реестром art_manage»;
контракт API — секция «Backend — Frontend: контракт API». Прочитай AGENTS.md
и REQUIREMENTS.md первым шагом (по одному разу). Прогресс фазы 5 —
tasks/current/dev/phase05_progress.md (авторизация, AuthContext, Toast, RequireAuth
готовы, билд зелёный).

Сделай фазу 6 целиком в `frontend/src/`:

1. `api/artManage.ts` (или дополни blog.ts/auth.ts) — GET /api/blog/art_manage,
   POST /api/blog/art_manage/add_all, POST /api/blog/art_manage/meta (JSON body
   {file_name, author, lang, title}) по контракту.
2. `pages/ArtManagePage.tsx` — замени заглушку ArtManageStub в App.tsx:
   - GET /api/blog/art_manage при входе на страницу;
   - таблица статей: file_name, author, lang, title, флаги complete и file_exists;
   - кнопка «Добавить все новые файлы» → POST add_all, toast по message/category;
   - форма редактирования для каждой строки (author, lang, title) → POST meta;
   - форма добавления записи для нового файла (file_name из unassigned_files,
     author, lang, title) → POST meta;
   - отображение yaml_error (если есть), списков unassigned_files и missing_entries;
   - после успешной мутации — перезагрузка данных (GET art_manage заново).
   Страница уже обёрнута в RequireAuth (App.tsx) — не снимай обёртку.
3. При 422 от meta — показ errors по полям (extractErrors из api/auth.ts).

Дисциплина: план файлов до первой записи; новый файл — одним write_file, существующие
(App.tsx и др.) — только точечные edit; сырые выводы — в tasks/current/dev/phase06_raw.txt;
прогресс — tasks/current/dev/phase06_progress.md; ошибку чинить узко; полный smoke
(`npm run build`) — один раз в конце. Backend на :8000 уже запущен (uvicorn) — живая
проверка опциональна: свой vite на 5173 подними и погаси по окончании; в чат — вердикты.
Важно: реестр articles.yaml — рабочие данные; НЕ выполняй реальные мутации против
бэкенда (add_all/meta) без необходимости — проверяй сборкой и чтением кода; если очень
нужно живое подтверждение — GET art_manage анонимом вернёт 403, этого достаточно.

Чекпоинт: `cd frontend && npm run build` без ошибок.

Отчитайся: список файлов, результат билда.
