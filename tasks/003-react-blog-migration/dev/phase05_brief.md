# Фаза 5: Авторизация — задание frontend-dev

Задание: «Миграция блога md_articles на React» (tasks/current/REQUIREMENTS.md).
Спецификация фазы — в REQUIREMENTS.md, секция «Фаза 5: Авторизация: register, login,
account»; контракт API — секция «Backend — Frontend: контракт API». Прочитай AGENTS.md
и REQUIREMENTS.md первым шагом (по одному разу). Прогресс фазы 4 —
tasks/current/dev/phase04_progress.md (публичные страницы готовы, билд зелёный).

Сделай фазу 5 целиком в `frontend/src/`:

1. `context/AuthContext.tsx` — контекст текущего пользователя: инициализация через
   GET /api/blog/current_user, обновление после login/account, сброс после logout.
   Подключи провайдер в main.tsx; Layout/Header переведи на этот контекст
   (убери локальный user-стейт из Layout.tsx и заглушку handleLogout).
2. `components/Toast.tsx` — toast-компонент: показывает message + category
   (success, danger, info, warning, message); автоскрытие; можно простым
   контекстом/хуком toast, без библиотек.
3. `api/auth.ts` (или дополни blog.ts) — register, login, logout, getAccount,
   updateAccount (multipart) по контракту.
4. `pages/RegisterPage.tsx` — форма (username, email, password, confirm_password),
   клиентская валидация, POST /api/blog/register; при 422 показывает errors
   по полям; при успехе toast + редирект на /login.
5. `pages/LoginPage.tsx` — форма (email, password), POST /api/blog/login;
   при успехе обновление пользователя + редирект на /; при 401 toast danger.
6. `pages/AccountPage.tsx` — GET /api/blog/account; форма username/email
   + multipart upload аватара (picture) через POST /api/blog/account
   (postMultipart с полем csrf_token — см. api/client.ts); после успеха
   обновление пользователя в AuthContext + toast. Показ текущего аватара
   (user.image_file).
7. Кнопка «Выход» в Header: POST /api/blog/logout, сброс пользователя,
   редирект на /, toast.
8. Защита маршрутов: /account (и /art_manage в фазе 6) — только для
   авторизованного: клиентская проверка по AuthContext (редирект на /login),
   403 от API остаётся страховкой. Подключи маршруты в App.tsx.

Дисциплина: план файлов до первой записи; новый файл — одним write_file, существующие
(Layout.tsx, Header.tsx, App.tsx, main.tsx) — только точечные edit; сырые выводы —
в tasks/current/dev/phase05_raw.txt; прогресс — tasks/current/dev/phase05_progress.md;
ошибку чинить узко; полный smoke (`npm run build`) — один раз в конце. Backend
на :8000 уже запущен (uvicorn) — для живой проверки можешь поднять свой vite на 5173
и погасить его по окончании; в чат — вердикты.

Чекпоинт: `cd frontend && npm run build` без ошибок.

Отчитайся: список файлов, результат билда.
