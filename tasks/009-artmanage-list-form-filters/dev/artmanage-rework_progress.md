# artmanage-rework — frontend-dev

## Цель
Переделка страницы «Управление реестром» (`/art_manage`):
- таблица → кликабельный список названий;
- одна форма редактирования выбранной записи (Автор/Язык/Заголовок + «Принять»);
- фильтры: поиск по title/file_name, чекбоксы «Без автора»/«Без языка»;
- готовая пагинация `<Pagination>`.

## Файлы
- `frontend/src/components/ArtManageForms.tsx` — точечный edit: удалить `ArtEditForm`, добавить `ArtEditSelectedForm`; стабилизировать `id` в `MetaField`.
- `frontend/src/pages/ArtManagePage.tsx` — полный `write_file`: новая структура с фильтрами/списком/панелью редактирования, остальные секции сохранены.
- `frontend/src/index.css` — точечный edit: добавить стили `.registry-filters/.registry-search/.registry-filter/.registry-list/.registry-item/.registry-item.active/.registry-item-meta/.registry-item-title/.art-edit-panel`.

## Контракты
- Бэкенд не трогаем. API: `getArtManage`, `addAllEntries`, `updateMeta` (422 → ошибки по полям), поля `author/lang/title/file_name/art_id/section/complete/file_exists`, `unassigned_files`, `missing_entries`, `yaml_error`.
- Поведение `ArtAddForm` сохраняем; `submitMeta` тоже.

## Что в результате
- Чекбокс «Без автора»: `author === 'NoName' || author.trim() === ''`.
- Чекбокс «Без языка»: `lang.trim() === ''`.
- Поиск: case-insensitive по `title` и `file_name`.
- Выбор: клик по `.registry-item` → подсветка `.active` (как `.menu-item.active`); повторный клик → снять выбор, панель скрывается.
- Сохранение через «Принять» → load(); selectedArtId сохраняется → выбранная запись после обновления снова подсвечивается.
- Сброс `page` на 1 при изменении фильтров/поиска/pageSize (делает сам компонент Pagination).

## Smoke
- `cd frontend && npm run build` — exit 0, без ошибок TS. Сырой вывод в `artmanage-rework_raw.txt`.

## Прогресс
- [x] Прочитаны исходники (ArtManagePage, ArtManageForms, artManage, Pagination, types, index.css).
- [x] Plan files.
- [x] ArtManageForms.tsx: убран ArtEditForm, добавлен ArtEditSelectedForm, стабильный id у MetaField.
- [x] ArtManagePage.tsx: полный rewrite.
- [x] index.css: добавлены стили списка/фильтров/панели.
- [x] npm run build — exit 0.
