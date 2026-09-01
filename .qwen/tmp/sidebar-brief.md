# Бриф: сайдбар + full-width layout блога (разовая правка UI)

Это РАЗОВАЯ правка UI вне цикла заданий. Пользователь прямо запретил выполнять
что-либо из tasks/current/REQUIREMENTS.md — не читай его и не трогай файлы в tasks/.

Сначала прочитай AGENTS.md (проектные соглашения), затем внеси правки только в своей
зоне `frontend/`.

Задача: левое меню-сайдбар с разделами, контент на всю ширину экрана при любом
масштабе, кнопки шапки по центру.

## Файлы (4, все в frontend/src)

1. НОВЫЙ `components/Sidebar.tsx` — одним write_file.
2. `components/Layout.tsx` — точечные edit.
3. `components/Header.tsx` — точечные edit.
4. `index.css` — точечные edit.

## Контракт

### Sidebar.tsx

Статичный компонент без роутинга (разделы-заглушки, «потом там разделы будут»):
`<aside className="site-sidebar">` с nav и 10 кнопками класса `side-link`:
Python, FastAPI, SQLAlchemy, React, TypeScript, Базы данных, Docker, Git,
Алгоритмы, Разное. Кнопки — блочные, во всю ширину сайдбара, текст по центру.
Стили — только на CSS-переменных тем (--card-bg, --border, --text, --accent и т.п.
из index.css), чтобы работало во всех 4 темах (dark/light/midnight/aurora).

### Layout.tsx

Каркас: шапка сверху; ниже новый контейнер `layout-body` (flex-ряд):
`<Sidebar />` + `<main>`; main — `flex: 1`, БЕЗ класса `container` (никаких
max-width — при любом зуме браузера контент тянется на всю оставшуюся ширину),
небольшой горизонтальный padding (~1rem). Футер — на всю ширину, без `container`,
с тем же горизонтальным padding.

### Header.tsx

Brand-текст заменить на «Сайт о программировании» (стиль/градиент brand-accent
можно сохранить на части текста). Навигационные кнопки (Статьи, Управление,
Аккаунт/Выход или Вход/Регистрация, О сайте) — по ЦЕНТРУ шапки; селекторы тем
остаются справа. Реализация: grid `1fr auto 1fr` у `.header-inner` (brand слева,
nav в центре, selects справа с justify-self: end).

### index.css

- `.layout-body { display: flex; align-items: flex-start; }`;
  `.site-sidebar { width: clamp(100px, 12vw, 150px); flex-shrink: 0; border-right: 1px solid var(--border); background: var(--card-bg); padding: 1rem 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; position: sticky; top: var(--header-height); max-height: calc(100vh - var(--header-height)); overflow-y: auto; }`.
- `.side-link` — width: 100%; text-align: center; padding ~0.5rem; border-radius;
  hover ЗАМЕТНО ярче (фон посветлее, текст к var(--accent) или белому).
- `.header-inner` — grid 1fr auto 1fr вместо flex; у brand небольшой отступ слева
  (padding-left ~0.75rem); nav по центру; `.header-selects { justify-self: end;
  margin-left: 0; }` (убрать margin-left: auto).
- `.nav-link:hover/.active` — ярче нынешнего (hover bg ~0.25, active ~0.35, текст
  белее).
- `.art-manage-page` — убрать `max-width: 80rem` (таблица на всю ширину, padding
  оставить).
- НЕ трогать: `.auth-page` (26rem — формы входа/регистрации остаются узкими по
  центру, это осознанно), `.page-stub`, `.toast`, темы.
- Комментарии на русском, в стиле файла.

## Checkpoint

Один раз в конце: `cd frontend && npm run build` — без ошибок. Если build падает —
чинить узко (правка + повторный build), максимум 2 попытки, дальше стоп и доклад.

## Дисциплина

Читай только AGENTS.md + эти 4 файла (плюс при необходимости соседние компоненты
точечно), план файлов до первой записи, новый файл — одним write_file, существующие —
только edit, полный build — один раз в конце. Сервер не поднимай.

В отчёте: список правок по файлам + результат build.
