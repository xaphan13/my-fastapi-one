# Фаза 4: Публичные страницы — задание frontend-dev

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Спецификация фазы — в REQUIREMENTS.md, секция «Фаза 4: Публичные страницы: home, about,
статья»; контракт API — секция «Backend — Frontend: контракт API». Прочитай AGENTS.md
и REQUIREMENTS.md первым шагом (по одному разу). Прогресс фазы 3 —
tasks/current/dev/phase03_progress.md (Layout/Header/темы/hljs/client.ts/types.ts готовы,
билд зелёный).

Сделай фазу 4 целиком в `frontend/src/`:

1. `api/blog.ts` — функции под GET /api/blog/articles и GET /api/blog/articles/{art_id}.
2. `components/ArticleCard.tsx` — карточка статьи (ссылка на /art/:author/:artId),
   красочный дизайн в стиле фазы 3 (карточки, скругления, тени, плавные переходы).
3. `components/MarkdownContent.tsx` — вставка готового серверного HTML из
   article.content (dangerouslySetInnerHTML только для этого доверенного HTML)
   + вызов window.hljs?.highlightAll() после монтирования/обновления контента.
4. `pages/HomePage.tsx` — GET /api/blog/articles, карточки только полных статей
   (complete === true), состояние загрузки/ошибки.
5. `pages/AboutPage.tsx` — статическая страница «О сайте» без API (содержание — перенеси
   суть со старой about-страницы: сайт статей о программировании; ориентир
   `fastapi-application/templates/about.html` — читать, не править).
6. `pages/ArticlePage.tsx` — парсит author и artId из URL (useParams),
   GET /api/blog/articles/{art_id}, показывает заголовок/автора + MarkdownContent;
   код всегда на тёмном фоне в любой теме сайта.
7. Подключи маршруты в App.tsx вместо заглушек `/`, `/about`, `/art/:author/:artId`.

Дисциплина: план файлов до первой записи; новый файл — одним write_file, существующий
(App.tsx) — только точечный edit; сырые выводы — в tasks/current/dev/phase04_raw.txt;
прогресс — tasks/current/dev/phase04_progress.md; ошибку чинить узко; полный smoke
(`npm run build`) — один раз в конце. Backend на :8000 уже запущен (uvicorn) — если
хочешь проверить dev-сервером, поднимай свой vite на 5173 и гаси его по окончании;
в чат — вердикты.

Чекпоинт: `cd frontend && npm run build` без ошибок.

Отчитайся: список файлов, результат билда.
