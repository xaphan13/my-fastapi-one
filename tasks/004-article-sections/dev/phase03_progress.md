# Фаза 3 — Frontend: типы, API и компонент меню

## Статус: в работе

## Сделано

- `frontend/src/types.ts` (точечный edit):
  - `Article` получил `section?: string` с комментарием-контрактом.
  - Добавлен `export interface Section { name; label; count }`.
- `frontend/src/api/blog.ts` (точечный edit):
  - Импорт `Section` добавлен.
  - `getArticles(section?: string)` — расширен: query-параметр `section`
    через `encodeURIComponent`, без параметра — пустая строка.
  - `getSections()` — новый, `getJson<{ sections: Section[] }>('/api/blog/sections')`.
- `frontend/src/components/SectionMenu.tsx` (новый, один write_file):
  - useEffect + cancelled-флаг (как в HomePage/ArtManageForms).
  - При ошибке `setSections([])` — тихий fallback, только «Все статьи».
  - `NavLink to="/"` с `end` для «Все статьи» — иначе пункт активен
    на всех вложенных маршрутах.
  - Остальные пункты — `to="/section/${name}"`; active-класс через
    `({ isActive }) => ...` (стиль Header.tsx).

## Стиль

- TypeScript strict: всё под типами, без `any`.
- Импорты: `from '../api/blog'`, `from '../types'` — как в окружении.
- Никаких CSS-стилей — это ответственность фазы 4 (index.css).

## Следующий шаг

- Checkpoint: `cd frontend && npm run build` — без ошибок.
- Сырой вывод — `tasks/current/dev/phase03_raw.txt`.

## Checkpoint

`npm run build` (= `tsc && vite build`) — exit 0, 53 модуля, без ошибок.
Сырой вывод: `tasks/current/dev/phase03_raw.txt`.

## Итог

Все три файла фазового объёма готовы. Ничего из чужой зоны (App.tsx,
Layout.tsx, HomePage.tsx, index.css) не тронуто.
