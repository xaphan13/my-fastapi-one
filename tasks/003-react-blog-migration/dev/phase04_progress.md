# Фаза 4: Публичные страницы — прогресс

Статус: ЗАВЕРШЕНА (восстановлено оркестратором после падения прогона на финальном отчёте).

## Сделано

- `frontend/src/api/blog.ts` — getArticles(), getArticle(artId) по контракту /api/blog.
- `frontend/src/components/ArticleCard.tsx` — карточка-ссылка /art/:author/:artId, стили .card/.card-hover фазы 3.
- `frontend/src/components/MarkdownContent.tsx` — dangerouslySetInnerHTML только для доверенного
  серверного HTML; window.hljs?.highlightAll() после монтирования/смены контента.
- `frontend/src/pages/HomePage.tsx` — GET /api/blog/articles, фильтр complete === true, состояния загрузки/ошибки.
- `frontend/src/pages/AboutPage.tsx` — статическая, без API.
- `frontend/src/pages/ArticlePage.tsx` — useParams(author, artId), GET /articles/{art_id},
  сверка автора с реестром, 404/ошибка/загрузка, MarkdownContent.
- `frontend/src/App.tsx` — маршруты `/`, `/about`, `/art/:author/:artId` подключены (заглушки заменены).

## Чекпоинт

- `cd frontend && npm run build` — exit 0 (сырой вывод в phase04_raw.txt: 44 modules,
  dist/index.html 7.45 kB, css 9.51 kB, js 175.37 kB).

## Заметки восстановления

- Прогоны фазы 4 падали на старте 4 раза (нестабильность провайдера minimax-m3);
  модель frontend-dev переключена оркестратором на nordrouter/z-ai/glm-5.3-flash.
- Пятый прогон выполнил фазу целиком (файлы + билд), но упал до записи прогресса;
  оставленный им vite (PID 1662882-1662883) погашен оркестратором.
- Мусорных файлов нет; dist не коммитится.
