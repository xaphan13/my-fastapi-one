# phase card-one-line — progress

## Задание

Доработка внешнего вида карточек статей: всё в одну горизонтальную строку + анимированный
многоцветный градиентный текст заголовка, читаемый во всех 4 темах.

## Файлы — ровно два

1. `frontend/src/components/ArticleCard.tsx` — точечный `edit` разметки.
2. `frontend/src/index.css` — точечный `edit` в конце файла: новые классы + анимация
   + переопределение градиента для светлой темы + `prefers-reduced-motion`.

## Что сделано

### ArticleCard.tsx

- Добавил класс `card-row` к `<Link>` (рядом с `card card-hover`). Новый класс
  заменит инлайн `display: 'block'` на `display: flex` — одну общую систему компоновки.
- Убрал инлайн `display: 'block'` (роль передана CSS-классу `.card-row`).
- `<h3 style={{ marginTop: 0 }}>` → `<h3 className="card-title-grad">`
  (класс задаёт `margin: 0`, градиент и ellipsis).
- `<p className="text-muted" style={{ marginBottom: '0.75rem' }}>` →
  `<p className="text-muted card-author">` (`margin: 0`, `flex-shrink: 0`,
  `white-space: nowrap`, компактнее).
- `<span className="badge">` → `<span className="badge card-lang">` (`flex-shrink: 0`).

### index.css

Добавлен блок `/* === Карточка статьи в одну строку === */` в самый конец файла,
после правил `.page-btn:disabled`:

- `.card-row`: `display: flex`, `align-items: center`, `flex-wrap: nowrap`, `gap: 0.85rem`.
- `.card-title-grad`:
  - flex-параметры: `flex: 1 1 auto; min-width: 0;` (заголовок тянется, при нехватке
    ширины ужимается с эллипсисом).
  - сжатие: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
  - типографика: `font-size: 1.1rem; font-weight: 700; line-height: 1.3;` (крупнее и
    жирнее обычного текста карточки).
  - градиент: `linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff)`
    (5 сочных оттенков — хорошо читается на всех тёмных темах: dark `#2a2a2a`,
    midnight `#1a1730`, aurora `#122019`).
  - `background-size: 200% auto` для плавного движения.
  - `-webkit-background-clip: text; background-clip: text; color: transparent`.
  - анимация `card-title-gradient 6s ease-in-out infinite alternate`.
- `.card-author`: `margin: 0; font-size: 0.875rem; flex-shrink: 0; white-space: nowrap`
  (компактный, не сжимается, не переносится).
- `.card-lang`: только `flex-shrink: 0`.
- `@keyframes card-title-gradient`: `from { background-position: 0% 50% } to { ... 100% 50% }`
  — простой туда-обратно alternate.
- `[data-theme="light"] .card-title-grad`: переопределение `background` на насыщенный
  контрастный спектр `#e74c3c → #d97706 → #2563eb → #8b5cf6 → #db2777`.
  На светлом `var(--card-bg)` (`#fffdf8`) светлые яркие цвета дефолта смотрелись бы
  блёкло — насыщенные тёмно-контрастные дают читаемость без потери «сочности».
  Свойства `background-size`, `background-clip`, `color: transparent` наследуются
  от основного правила.
- `@media (prefers-reduced-motion: reduce) { .card-title-grad { animation: none; background-position: 0% 50%; } }`
  — отключение анимации для доступности. Фиксирую `background-position: 0% 50%`,
  чтобы при выключенной анимации градиент всегда стартовал слева.

## Дизайн-решения

- **Цвета дефолта**: `#ff6b6b → #feca57 → #48dbfb → #ff9ff3 → #54a0ff` — 5 сочных
  оттенков с балансом тёплых/холодных. Подобраны так, чтобы на всех трёх тёмных
  темах проекта (dark `var(--card-bg) #2a2a2a`, midnight `#1a1730`, aurora `#122019`)
  был хороший контраст и эффект градиента был заметен.
- **Цвета для светлой темы**: `#e74c3c → #d97706 → #2563eb → #8b5cf6 → #db2777` —
  насыщенные/полу-насыщенные цвета, контрастные к светлому фону `var(--card-bg) = #fffdf8`.
- **Длительность анимации**: 6 секунд, `ease-in-out`, `infinite alternate` —
  плавное «перетекание» туда-обратно без рывков. Альтернатива была 4–5s; выбрал 6s,
  чтобы переход не отвлекал от чтения.
- **Шрифт и размер**: 1.1rem (заголовок чуть крупнее обычного текста карточки),
  font-weight 700. Не делал 1.2rem+, чтобы карточка оставалась компактной
  (задание — «всё в одну строку»).
- **Почему gap 0.85rem**: визуально делит три области карточки достаточно явно,
  при этом помещается в общую ширину.

## Проверка

`npm run build` — exit 0, 55 modules transformed, дист собран. Сырой вывод в
`tasks/current/dev/card-one-line_raw.txt`.

Build зелёный, TypeScript ошибок нет, Vite ругани не дал. Никаких других файлов
не трогал.
