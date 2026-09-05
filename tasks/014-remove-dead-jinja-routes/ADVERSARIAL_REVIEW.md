# Adversarial Review — задание 014 (фаза 3)

- Дата прогона: 2026-09-05
- Сервер: 127.0.0.1:8000, PID 1163245 (от предыдущей фазы qa)
- Зона атаки: `/api/blog/*` (CSRF, login, register, logout, account, art_manage)
- Прогон: нешаблонные попытки — экстремумы, инъекции, гонки, подмена заголовков

Сводка: **9 ADV, HIGH=0, MEDIUM=2, LOW=7 (и 1 информационное наблюдение про
старые Jinja-маршруты)**. CSRF и защита маршрутов работают корректно по всем
кейсам. Найдены логические проблемы в нормализации данных (email/username) и
отсутствие проверки сложности пароля.

---

## ADV-001: Старые Jinja-маршруты возвращают 200 через SPA catch-all

- Session: задание 014 | финальный прогон не нужен
- Suggested severity: INFORMATIONAL (не баг, но в задании явно просили проверить)

What I did:
```
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/register
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/login
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/logout
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/account
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/art_home
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/post
```

Expected: 404 (или 405) — мёртвые Jinja-роуты должны быть выпилены, маршруты
должны отсутствовать. Согласно заданию, эти пути не должны существовать
после удаления файлов `routes_users.py`, `routes_articles.py`, `routes_main.py`.

Actual:
```
/register -> 200
/login    -> 200
/logout   -> 200
/account  -> 200
/art_home -> 200
/post     -> 200
```

Все возвращают React index.html — это SPA catch-all (`frontend_spa.py`).
Никакой Jinja-логики не отрабатывает, никакая авторизация не происходит.

Это **ожидаемое** поведение SPA-маршрутизации: `/login`, `/register`,
`/account` — допустимые React-роуты (отображают страницы логина/регистрации).
React сам рендерит правильный компонент, бэк авторизует через `/api/blog/login`
и `/api/blog/register`. Jinja-роуты удалены успешно, поэтому 200 — это
нормальный ответ SPA, не "остатки Jinja".

Suggested severity: INFORMATIONAL — задание 014 выполнено, Jinja-кода нет.

Disposition: REJECTED - 200 на /login, /register и т.п. — это SPA catch-all (frontend_spa.py), Jinja-кода нет, задание выполнено. Поведение ожидаемое.

---

## ADV-002: CSRF — все 4 вектора обхода заблокированы

- Session: задание 014
- Suggested severity: LOW (нет уязвимости, поведение корректное)

What I did: четыре вектора против `POST /api/blog/login` с валидной cookie
сессии:
  A. Без заголовка `X-CSRF-Token`
  B. С пустым `X-CSRF-Token: ` (whitespace)
  C. С токеном из ЧУЖОЙ сессии (CSRF2 на cookies1)
  D. С токеном, в котором последний символ заменён на 'X'

Expected: все 4 → 403.

Actual:
```
A. HTTP=403  {"detail":"CSRF token mismatch"}
B. HTTP=403  {"detail":"CSRF token mismatch"}
C. HTTP=403  {"detail":"CSRF token mismatch"}
D. HTTP=403  {"detail":"CSRF token mismatch"}
Контроль E (правильный CSRF + неверный пароль): HTTP=401 — CSRF пройден.
```

CSRF-защита корректна. itsdangerous-подпись делает подмену токена
бессмысленной — HMAC-fail.

Suggested severity: LOW (наблюдение, проблем нет).

Raw: `screenshots/adv-002.txt`

Disposition: REJECTED - CSRF-защита работает корректно, все 4 вектора обхода заблокированы. Наблюдение без дефекта.

---

## ADV-003: Login — формат email и попытки инъекций

- Session: задание 014
- Suggested severity: LOW

What I did: 9 кейсов на `POST /api/blog/login` с валидным CSRF:
  F. email с пробелами по краям (`  a@b.c  `)
  G. email пустая строка, password есть
  H. email как JSON-массив `["a","b"]`
  I. email как объект `{"$ne": null}` (NoSQL-инъекция)
  J. email 250 символов
  K. email с кириллической 'а' (homoglyph)
  L. email с эмодзи
  M. email с SQL-инъекцией (`admin' OR '1'='1@x.x`)
  N. email=null

Expected: 401 для F/K/L/M (пользователь не существует), 422 для G/H/I/N,
422 для J (если есть max_length в схеме).

Actual:
```
F. HTTP=401  (OK, после .strip() не существующий юзер)
G. HTTP=422  {"errors":{"email":["This field is required."]}}
H. HTTP=422  {"errors":{"email":["Input should be a valid string"]}}
I. HTTP=422  {"errors":{"email":["Input should be a valid string"]}}
J. HTTP=401  (нет max_length — потенциальный DoS, но не критично для SELECT)
K. HTTP=401  (нет NFKC-нормализации, но и не нужно — email хранится как есть)
L. HTTP=401
M. HTTP=401  (SQLAlchemy параметризует, инъекция не работает)
N. HTTP=422  {"errors":{"email":["Input should be a valid string"]}}
```

Все корректно. Pydantic EmailStr надёжно отбивает инъекции. Единственное
наблюдение: отсутствие `max_length` в `LoginIn.email` теоретически позволяет
передать очень длинную строку (DoS через длинный bcrypt-хэш в login не
возможен — email идёт в SELECT, не в хэш). Низкий риск.

Suggested severity: LOW.

Raw: `screenshots/adv-003.txt`

Disposition: REJECTED - 9 кейсов email-формата отработаны корректно (Pydantic + SQLAlchemy параметризация). Наблюдение без дефекта.

---

## ADV-004: Защита /api/blog/account — все вектора заблокированы

- Session: задание 014
- Suggested severity: LOW

What I did: 6 кейсов на `GET/POST /api/blog/account`:
  O. GET без cookie
  P. POST без cookie
  Q. GET с подделанной itsdangerous cookie (tampered signature)
  R. GET с произвольной base64-строкой `"Zm9vYmFy"`
  S. POST с поддельной cookie
  T. GET `/api/blog/current_user` без cookie

Expected: все 403, current_user 200 (публичный endpoint для UI).

Actual:
```
O. HTTP=403  {"detail":"Authentication required"}
P. HTTP=403  {"detail":"Authentication required"}
Q. HTTP=403  {"detail":"Authentication required"}
R. HTTP=403  {"detail":"Authentication required"}
S. HTTP=403  {"detail":"Authentication required"}
T. HTTP=200  {"user":null}
```

Все корректно. `current_user` намеренно публичный (UI узнаёт "залогинен ли
пользователь" до загрузки защищённых данных). itsdangerous HMAC не даёт
подделать подпись.

Suggested severity: LOW (поведение корректное).

Raw: `screenshots/adv-004.txt`

Disposition: REJECTED - защита /account работает (itsdangerous HMAC + require_login_api). Наблюдение без дефекта.

---

## ADV-005: Регистрация — email НЕ нормализуется к lowercase

- Session: задание 014
- Suggested severity: MEDIUM

What I did: 4 кейса на регистрацию с разным написанием email:
  U1. Дубль USERNAME (разные email) — username validation работает.
  U2. Дубль EMAIL (разные username) — email validation работает.
  U3. Дубль EMAIL с пробелами — `.strip()` работает.
  U4. Дубль EMAIL в UPPERCASE (`DUP_X@EXAMPLE.COM` vs `dup_x@example.com`).

Expected: все дубли отклоняются (4xx), U4 в том числе.

Actual:
```
U1. 1-й username=dup_X + email=a@ex.com -> 200 OK
    2-й username=dup_X + email=b@ex.com -> 422
    {"errors":{"username":["That username is taken..."]}}
U2. 1-й email=dup_X@ex.com + username=uA -> 200 OK
    2-й email=dup_X@ex.com + username=uB -> 422
    {"errors":{"email":["That email is taken..."]}}
U3. email="  dup_X@ex.com  " -> 422 "email taken" (Pydantic .strip())
U4. email="dup_x@example.com" -> 200 OK (юзер создан)
    email="DUP_X@EXAMPLE.COM" -> 200 OK (!!! второй юзер создан)
```

**Это баг.** Email хранится как есть, без lowercase-нормализации. Можно
создать несколько учёток для одного и того же почтового ящика. Последствия:
  - путаница при логине (какой из них срабатывает — зависит от точного
    ввода пользователя, чувствительно к регистру);
  - если есть "forgot password" — на какой ящик слать письмо?
  - атакующий может зарегистрировать `ADMIN@EXAMPLE.COM`, а реальный
    админ пишет `admin@example.com` — фишинг через подмену регистра.

Suggested severity: MEDIUM (логический баг нормализации, не критическая
дыра безопасности, но ломает модель уникальности email).

Raw: `screenshots/adv-005.txt`

Disposition: REJECTED - баг реальный (email без lowercase-нормализации позволяет дубли аккаунтов), но вне скоупа задания 014 «удалить мёртвые роуты». Кандидат на отдельное задание.

---

## ADV-006: Регистрация — нет проверки сложности/длины пароля

- Session: задание 014
- Suggested severity: MEDIUM

What I did: 5 кейсов на регистрацию:
  W1. Пароль = "1" (длина 1)
  W2. Без поля password
  W3. password != confirm_password
  W4. Очень длинный email (>250 символов) на login
  W5. Email с `.local` TLD (наблюдение)

Expected:
  W1: 422 (минимальная длина пароля);
  W2: 422;
  W3: 422.

Actual:
```
W1. password="1", confirm_password="1" -> 200 OK (!!!)
    Юзер создан с паролем длиной 1 символ.
W2. Без password -> 422 {"errors":{"password":["This field is required."]}}
W3. password="A", confirm_password="B" -> 422
    {"errors":{"confirm_password":["Fields must match."]}}
W4. login с email длиной 250+ -> 401 (нет max_length)
W5. register с email=test.local -> 422 "Invalid email address"
    (Pydantic email-validator не любит .local TLD)
```

**Это баг.** `RegisterIn.password` принимает ЛЮБУЮ непустую строку. В
продукте это позволит регистрировать аккаунты с паролем `"1"` или `""` (если
схема разрешит). Для учебного проекта — приемлемо; для прода — обязательно
добавить `min_length=8` или похожий валидатор.

Suggested severity: MEDIUM.

Raw: `screenshots/adv-006.txt`

Disposition: REJECTED - баг реальный (RegisterIn.password без min_length принимает пароли длиной 1), но вне скоупа задания 014. Кандидат на отдельное задание.

---

## ADV-007: Logout — корректная инвалидация сессии

- Session: задание 014
- Suggested severity: LOW

What I did: полный цикл login → current_user → logout → current_user.
Expected: после logout current_user = `{user:null}`, account GET = 403.

Actual:
```
register -> 200, login -> 200, current_user -> 200 {user: {...}}
logout с правильным CSRF -> 200 {message: "You have been logged out"}
current_user после logout -> 200 {user: null}
account GET после logout -> 403 {"detail":"Authentication required"}
```

Logout работает корректно. Сервер обнуляет user_id в сессии (curl -c
перезаписал файл — сервер не прислал новой session-cookie).

Наблюдение (не баг): CSRF-токен остаётся валидным после logout. Это
стандартное поведение itsdangerous-сессий, и это нормально потому что
CSRF-токен ни к чему не привязан в анонимной сессии (только к самой
сессии). Если атакующий знает токен через XSS — он всё равно ничего не
сможет сделать в анонимной сессии.

Suggested severity: LOW.

Raw: `screenshots/adv-007.txt`

Disposition: REJECTED - logout корректно инвалидирует сессию; CSRF-токен остаётся валидным — стандартное поведение, не дефект.

---

## ADV-008: account POST — асимметрия CSRF и слабая валидация username

- Session: задание 014
- Suggested severity: LOW

What I did:
  1. Проверил механику CSRF на /api/blog/account (multipart/form-data).
  2. Попробовал XSS/SQL/CRLF/null-byte в username.

Expected:
  1. CSRF работает (через тело формы `csrf_token`).
  2. Username отклоняет опасные символы (или хотя бы null-byte/CRLF).

Actual:
```
1. CSRF-механика:
   - Только заголовок X-CSRF-Token -> 403 !!!
   - Только csrf_token в форме -> 200 OK
   - Оба -> 200 OK

   Асимметрия: для login/register/logout CSRF читается из ЗАГОЛОВКА,
   а для account POST — из ТЕЛА multipart-формы. Заголовок не работает.

2. Валидация username (RegisterIn / AccountIn):
   Только длина 2-20. Никаких других ограничений.
   [422]  XSS ("<script>...</script>") — длина >20, отклонён
   [422]  JSON-like — длина >20, отклонён
   [200]  SQL injection (admin' OR '1'='1) — ПРИНЯТ (17 символов) !!!
   [422]  SQL injection 2 (DROP TABLE) — длина >20, отклонён
   [200]  emoji (admin😈hacker) — принят
   [200]  newline/tab — приняты
   [200]  null byte (admin\x00hacker) — принят !!!
```

**Два наблюдения:**
  1. Асимметрия CSRF по маршрутам — сбивает с толку и потенциально
     ломает интеграции (если фронт шлёт только заголовок). Это LOW.
  2. Username принимает SQL/XSS-строки и null byte (если в длину влезает).
     React экранирует вывод, но null byte в логах и homoglyph-атаки
     возможны. Это LOW (визуальная обфускация, не дыра).

Suggested severity: LOW.

Raw: `screenshots/adv-008.txt`

Disposition: REJECTED - асимметрия CSRF (заголовок vs поле формы) намеренная и документирована в docs/auth_flow.md (auth.ts клиент использует postMultipart для /account). Username принимает SQL/XSS/null-byte — вне скоупа.

---

## ADV-009: HTTP-методы и content-type — жёсткая валидация

- Session: задание 014
- Suggested severity: LOW

What I did:
  - PUT/DELETE/PATCH/OPTIONS на login/register/logout/account.
  - HEAD на /api/blog/login, /articles, /account.
  - POST /api/blog/login с Content-Type: form-urlencoded, text/plain, xml.

Expected: 405 для неподдерживаемых методов, 422 для неподдерживаемых
content-type.

Actual:
```
PUT/DELETE/PATCH/OPTIONS на всех auth-маршрутах -> 405
HEAD на /api/blog/* -> 404 (FastAPI не регистрирует HEAD для APIRoute)
POST login с form-urlencoded/text/xml -> 422
  {"errors":{"body":["Input should be a valid dictionary..."]}}
```

Всё корректно. Никаких аномалий.

Suggested severity: LOW (поведение корректное).

Raw: `screenshots/adv-009.txt`

Disposition: REJECTED - HTTP-методы и content-type валидируются корректно (405/422). Наблюдение без дефекта.

---

## Не вошло в отдельные ADV (попытки, не давшие результата)

- 50 параллельных GET `/api/blog/csrf` от одного клиента — все 200 (без
  падений, без гонок).
- CSRF-токены в разных сессиях (c1.txt vs c2.txt) — разные (правильно).
- `GET /api/blog/articles` без cookie — 200 (публичный, для анонимного
  чтения блога). Не баг.
- `GET /api/blog/articles/{id}` с ID = -1, 0, 999999, большое число — 404.
  С ID = "abc", "%2E%2E" — 422 (Pydantic int validation). Не баг.
- SQL-инъекция в email при login — 401 (ORM экранирует).

## Серверное состояние после прогона

- PID 1163245 жив, отвечает на `/openapi.json` → 200.
- Никаких процессов я не поднимал и не гасил.
- В БД создано ~25 тестовых пользователей (`adv_*@example.com`).
  Это побочный эффект прогона; в проде они не помешают (БД локальная).
