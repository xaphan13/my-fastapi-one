# Phase — боковая панель для /art_manage

## Задание (frontend-dev)
- Формы правки/добавления — в боковой панели справа, выбор пользователя.
- 4 файла: новый SidePanel.tsx + точечные правки ArtManageForms.tsx (onSaved),
  ArtManagePage.tsx (две точки открытия), index.css (стили панели).

## Файлы
- 1. `frontend/src/components/SidePanel.tsx` — НОВЫЙ (write_file).
- 2. `frontend/src/components/ArtManageForms.tsx` — edit: опциональный prop `onSaved` у ArtEditSelectedForm, вызов после submitMeta.
- 3. `frontend/src/pages/ArtManagePage.tsx` — edit: импорт SidePanel, удаление inline .art-edit-panel, обёртка форм, кнопка «Добавить запись для нового файла» вместо инлайн-формы.
- 4. `frontend/src/index.css` — edit: добавить .side-panel-overlay/.side-panel/.side-panel-header/.side-panel-body, @keyframes slideIn, @media prefers-reduced-motion. Удалить .art-edit-panel (больше нигде не используется).

## Прогресс
- [x] Шаг 0: прочитал ArtManagePage.tsx, ArtManageForms.tsx, index.css
- [x] Шаг 1: SidePanel.tsx — написан
- [x] Шаг 2: ArtManageForms.tsx — добавлен onSaved
- [x] Шаг 3: ArtManagePage.tsx — две точки открытия
- [x] Шаг 4: index.css — стили панели
- [x] Шаг 5: npm run build — зелёный

## Smoke (2026-09-01)
- `npm run build` → exit 0, TS чист, 56 modules, dist собран (CSS 19.52 kB, JS 195.55 kB).
- Полный вывод: `dev/sidepanel_raw.txt`.

## Контракты
- Две точки открытия панели: `editPanelOpen` (по клику в списке) и `addPanelOpen` (по кнопке «Добавить запись для нового файла»). Каждая снимает свой флаг через `onClose`.
- Esc/overlay/✕ унифицированы внутри `SidePanel` через единый `onClose`.
- Подсветка выбранного пункта списка (`registry-item.active`) гасится одновременно с панелью — у согласованности списка и формы.
- onSaved срабатывает только при успешном `updateMeta`; 422-ошибки форму оставляют открытой.
- Жизненный цикл Esc-листенера: addEventListener при open=true, removeEventListener в cleanup → пересоздаётся при каждом открытии, но callback свежий.
