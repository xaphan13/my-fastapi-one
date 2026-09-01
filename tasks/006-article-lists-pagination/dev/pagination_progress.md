# phase01: клиентская пагинация — прогресс

## Контракт (из задания)

- `frontend/src/components/Pagination.tsx` — новый, props:
  `total`, `page`, `pageSize`, `onPageChange`, `onPageSizeChange`.
  Размер 5/10/20, default 10 на стороне родителей. «‹ Назад / Вперёд ›».
  При ≤ 7 страницах — кликабельные номера, иначе счётчик.
  При total/pageSize ≤ 1 — return null. Смена размера → page=1.

- `HomePage.tsx`: статьи (отфильтрованы по complete) режутся по
  page/pageSize; состояние `page` сбрасывается в 1 при смене `section`;
  клампинг при несоответствии текущей страницы и числа страниц;
  `<Pagination>` под сеткой.

- `ArtManagePage.tsx`: пагинация таблицы «Записи реестра»
  (`data.articles`); локальный state; остальные секции — без пагинации.

- `index.css`: `.pagination` (flex, gap, центр, margin-top), `.page-btn`
  в стиле `.menu-item`/`.btn` (var(--border), var(--card-bg), hover),
  `.page-btn.active` по образцу `.menu-item.active` (var(--btn-grad),
  белый текст), `.page-btn:disabled` приглушён.

## План правок (порядок)

1. Написать `components/Pagination.tsx` целиком.
2. Точечно править `pages/HomePage.tsx` — добавить state/slice/render.
3. Точечно править `pages/ArtManagePage.tsx` — то же для таблицы.
4. Точечно править `index.css` — блок стилей `.pagination`.
5. `npm run build` (exit 0) — сырой вывод в pagination_raw.txt.

## Решения

- Pagination stateless. Клампинг `page` внутри компонента (защита от
  рассинхрона); родитель всё равно пересчитывает при reload данных.
- `handlePageSize` дёргает `onPageSizeChange(size)` затем `onPageChange(1)` —
  разделены, чтобы не было гонок состояний.
- `PAGE_SIZES` = [5, 10, 20] как локальная константа.
- Стили `.page-btn` опираются на токены темы (var(--border), var(--card-bg),
  var(--btn-grad)), без новых переменных.

## Заметки при правках

- В дереве уже висели незакоммиченные правки task 004-article-sections
  (useParams, `section`, новый текст заголовка). Я редактировал файл в
  рабочей копии; пагинация добавлена поверх без конфликта.
- Хук `useMemo` сначала попал после ранних `return` (нарушение правил
  хуков) — заменён на простое вычисление `slice` на каждом рендере:
  массив статей меняется только при загрузке, поэтому дешёво.

## Smoke

`npm run build` (cwd = `frontend/`) — exit 0, 55 модулей
(было 54, +1 на `Pagination`), без TS-ошибок.
Сырой вывод: `tasks/current/dev/pagination_raw.txt`.
