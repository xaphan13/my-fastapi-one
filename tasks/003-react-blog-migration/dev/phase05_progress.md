# Фаза 5: Авторизация — прогресс

Статус: ЗАВЕРШЕНА.

## Сделано

- `frontend/src/context/AuthContext.tsx` — AuthProvider/useAuth: инициализация
  через GET /api/blog/current_user, refresh(), setUser; провайдер подключён в main.tsx.
- `frontend/src/components/Toast.tsx` — ToastProvider + useToast: message + category
  (success, danger, info, warning, message), автоскрытие 4с, закрытие кнопкой;
  без библиотек; подключён в main.tsx над AuthProvider.
- `frontend/src/api/auth.ts` — getCurrentUser, register, login, logout, getAccount,
  updateAccount (multipart через postMultipart, csrf_token полем формы), extractErrors
  для 422 {errors}.
- `frontend/src/pages/RegisterPage.tsx` — форма username/email/password/confirm_password,
  клиентская валидация (validate() экспортируется), показ ошибок полей; при успехе
  toast + редирект /login; экспортирует FormField (переиспользуется LoginPage/AccountPage).
- `frontend/src/pages/LoginPage.tsx` — форма email/password; успех: setUser + toast +
  редирект /; 401/ошибка: message/category из ответа бэкенда в toast danger.
- `frontend/src/pages/AccountPage.tsx` — GET /api/blog/account при входе, форма
  username/email + файл picture (multipart), показ текущего аватара
  /static/profile_pics/{user.image_file}; успех: setUser + toast.
- `frontend/src/components/Layout.tsx` — убраны локальный user-стейт и getJson-загрузка;
  user из AuthContext; handleLogout: POST /api/blog/logout, сброс пользователя,
  toast (fallback при сетевом сбое).
- `frontend/src/components/Header.tsx` — только комментарий (интерфейс props не менялся).
- `frontend/src/App.tsx` — маршруты /login, /register, /account реальными страницами;
  RequireAuth (по useAuth, редирект /login при анониме) на /account и /art_manage
  (заглушка фазы 6 уже за защитой); /art/:author/:artId как в фазе 4.
- `frontend/src/main.tsx` — ToastProvider + AuthProvider обёрнуты вокруг App.

## Checkpoint

- `cd frontend && npm run build` — exit 0 (сырой вывод в phase05_raw.txt: 50 modules,
  dist/index.html 7.45 kB, js 183.70 kB).

## Заметки

- Первый write_file Toast.tsx ушёл в components/ через нормализацию пути (../.. в пути);
  файл пересоздан прямо в components/, дублей нет.
- Первая сборка упала (7 ошибок TS: ./Toast не резолвился при отсутствии файла,
  User не импортирован в LoginPage, лишний FormEvent в RegisterPage) — исправлено
  точечно, повторная сборка зелёная.
- Живая проверка на vite:5173 не проводилась — билд-чекпоинт зелёный, backend-проверки
  авторизации покроет qa в фазе 8.