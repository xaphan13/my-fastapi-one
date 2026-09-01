# Фаза 4 — подключение меню и фильтрация главной страницы

## План

1. `frontend/src/App.tsx` — добавить `<Route path="/section/:name" element={<HomePage />} />` рядом с `/`.
2. `frontend/src/components/Layout.tsx` — заменить 10 статических кнопок на `<SectionMenu />`.
3. `frontend/src/pages/HomePage.tsx` — `useParams` для имени раздела, динамический заголовок и сообщение о пустом разделе.
4. `frontend/src/index.css` — стиль `.menu-item.active` рядом с уже существующими `.menu-item*` (не конфликтует с hover/focus-visible).

## Прогресс

- [x] План
- [x] Правка App.tsx — маршрут /section/:name
- [x] Правка Layout.tsx — SectionMenu
- [x] Правка HomePage.tsx — useParams + динамический заголовок
- [x] Правка index.css — .menu-item.active
- [x] npm run build (smoke) — clean, 54 modules, 190 kB JS / 13 kB CSS, 1.37s
- [x] curl проверки API — /sections 200 {"sections":[]}; /articles?section=test 200 {"articles":[]}; /articles 200 (есть статьи, section:""); SPA / 200