# sticky-menu — прогресс

- Что: правило `.left-menu` в `frontend/src/index.css` — пункты меню остаются
  на месте при прокрутке контента статьи.
- Почему: `.app-body` — grid из двух колонок; без sticky меню уезжает вместе
  со страницей. В grid-колонке `position: sticky` не работает без
  `align-self: start` (иначе элемент растянут на всю высоту строки).
- Что добавлено: `position: sticky; top: 0; align-self: start; max-height: 100vh; overflow-y: auto;`
  Существующие свойства (background, border-right, padding, flex, gap, min-width)
  не тронуты. Комментарий в стиле файла — по-русски, объясняет зачем sticky+align-self.
- Проверка: `cd frontend && npm run build` — exit 0, без ошибок и предупреждений
  (55 модулей, 2.27s, CSS 15.52 kB). Сырой вывод — `tasks/current/dev/sticky-menu_raw.txt`.
- Сервер не поднимался (правка чисто CSS, проверяется сборкой).
- Статус: DONE.
