# Фаза 6: Управление реестром art_manage — прогресс

Статус: ЗАВЕРШЕНА ( checkpoint после финальной сборки см. в phase06_raw.txt).

## Сделано

- `frontend/src/api/artManage.ts` — getArtManage (GET /api/blog/art_manage),
  addAllEntries (POST add_all), updateMeta (POST meta с JSON body
  {file_name, author, lang, title}); MessageResp переиспользован из api/auth.ts.
- `frontend/src/components/ArtManageForms.tsx` — ArtEditForm (форма
  редактирования author/lang/title для каждой строки, POST meta),
  ArtAddForm (select file_name из unassigned_files + author/lang/title,
  POST meta); ошибки 422 по полям через extractErrors, toast по
  message/category; значения формы подтягиваются при изменении пропсов.
- `frontend/src/pages/ArtManagePage.tsx` — GET art_manage при входе
  (useCallback+useEffect), таблица (file_name, author, lang, title, бейджи
  complete/file_exists), кнопка «Добавить все новые файлы» → add_all,
  блок yaml_error, списки unassigned_files и missing_entries; после
  успешных мутаций — перезагрузка контекста (load()).
- `frontend/src/App.tsx` — точечные правки: импорт ArtManagePage, удалена
  заглушка ArtManageStub, маршрут /art_manage рендерит ArtManagePage
  (обёртка RequireAuth сохранена).
- `frontend/src/index.css` — добавлены стили: таблица реестра, бейджи
  ok/warn, компактные meta-формы, form-field (использовались фазой 5,
  но не имели стилей), auth-page/account-avatar, missing-list,
  add-all-block, toast-контейнер (тоже был без стилей после фазы 5).

## Checkpoint

- `cd frontend && npm run build` — exit 0 (см. phase06_raw.txt; первая сборка
  упала на TS2305: extractErrors импортировался из artManage вместо auth.ts —
  исправлено, повторная сборка зелёная).

## Notes

- Мутации против живого бэкенда не выполнялись (реестр articles.yaml —
  рабочие данные, по брифу проверяем сборкой); анонимный GET art_manage
  на :8000 не проверялся — RequireAuth перенаправит на /login до запроса.
- Исправлена опечатка в ArtAddForm (в file_name уходил author вместо
  fileName) сразу после создания файла.