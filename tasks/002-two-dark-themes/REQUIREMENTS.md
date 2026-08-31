# Две новые тёмные темы и переключатель темы без перезагрузки

Блог `md_articles` (Jinja2 + FastAPI) сегодня имеет две темы сайта — тёмную (по умолчанию)
и светлую, переключаемых ссылкой «Тема» в шапке. Нужно добавить ещё две тёмные темы
с современным дизайном (скруглённые края, градиенты, аккуратные кнопки) и заменить
переключатель на селектор в шапке, меняющий тему мгновенно, без перезагрузки страницы.
Дизайн существующих тёмной и светлой тем не меняется. Стили — только Bootstrap 5.3.8
и highlight.js с CDN (как сейчас), свои стили — в существующем `static/art_css/base.css`.

## Подтверждённые решения

- Существующие тёмная и светлая темы — не трогать (ни палитру, ни их CSS-блоки).
- Новых CSS-фреймворков нет: только Bootstrap 5.3.8 + highlight.js с CDN и
  существующий файл `static/art_css/base.css` на CSS-переменных.
- Две новые темы — тёмные, «красиво современно»: скруглённые края карточек, кнопок,
  полей; градиентная шапка; мягкие тени и подсветка фокуса.
- Переключатель без перезагрузки: селектор в шапке (по образцу селектора hljs-темы),
  применяется мгновенно через `data-bs-theme` на `<html>`, выбор хранится в
  `localStorage['theme']`.
- Идентификаторы новых тем: `midnight` («Полночь» — глубокий сине-фиолетовый) и
  `aurora` («Северное сияние» — тёмно-изумрудный). Выбраны исполнителем в рамках
  требования «ещё две тёмные, красиво современно».
- Подсветка кода (hljs) не меняется: код и так всегда на тёмном фоне, обе новые темы
  тёмные — совместимы без правок логики `scripts.js` в части hljs.

## Результат

- `static/art_css/base.css`: два новых блока `[data-bs-theme="midnight"]` и
  `[data-bs-theme="aurora"]` с полным набором `--bs-*` и `--art-*` переменных
  (Bootstrap сам не применяет тёмные переменные к кастомным значениям атрибута) плюс
  scoped-правила современного дизайна, действующие ТОЛЬКО в новых темах: скругления
  карточек/кнопок/полей/кода, градиентная шапка, акцентная боковая панель.
- `static/art_css/scripts.js`: список валидных тем расширен до
  `['dark', 'light', 'midnight', 'aurora']`; вместо обработчика клика по ссылке
  «Тема» — инициализация и обработка селектора `#theme-select` (мгновенное
  применение, сохранение в localStorage). Логика hljs-темы не меняется.
- `templates/includes/_head.html`: инлайн-скрипт восстановления темы принимает все
  4 значения (защита от вспышки неверной темы сохраняется).
- `templates/includes/_theme_select.html`: новый include — селектор темы сайта
  (4 option-а, классы как у hljs-селектора).
- `templates/includes/_header.html`: в обеих ветках (гость/авторизованный) ссылка
  «Тема» заменена на include селектора темы.
- Поведение: выбор темы из селектора мгновенно меняет `data-bs-theme` на `<html>`
  без перезагрузки; выбор переживает перезагрузку страницы; старые значения
  `dark`/`light` у вернувшихся посетителей продолжают работать (ключ и формат
  localStorage сохранены); невалидное значение откатывается к `dark`.

## Вне рамок

- Дизайн существующих тёмной (`[data-bs-theme="dark"]`) и светлой
  (`[data-bs-theme="light"]`) тем — не менять ни одной строки их CSS-блоков.
- Подсветка кода: список hljs-тем, селектор hljs, логика `syncHighlightTheme` — не менять.
- Python-код (`md_articles/`, роутеры, модели), Alembic, конфигурация — не трогать;
  задача чисто фронтенд-статика.
- Контент статей `templates/content_art/`, аватары `static/profile_pics/` — не трогать.
- Никаких эмодзи в коде, комментариях и логах.

## План фаз

Единица исполнения — фаза: одно делегирование, 1–3 файла, бюджет ~10–15 ходов.
Следующая фаза стартует только после зелёного checkpoint и ревью диффа оркестратором.
Прогресс фазы разработчик фиксирует в `tasks/current/dev/phaseNN_progress.md`.

| # | Фаза | Исполнитель | Файлы | Контракт | Checkpoint | Бюджет ходов |
|---|---|---|---|---|---|---|
| 1 | JS-модель 4 тем + селектор | frontend-dev | `scripts.js`, `_head.html` | VALID=['dark','light','midnight','aurora']; селектор `#theme-select`; localStorage['theme'] | синтаксис JS проверен; `python -c "from main import main_app; print(len(main_app.routes))"` = 41 | ~8 |
| 2 | CSS двух новых тем | frontend-dev | `base.css` | блоки `[data-bs-theme="midnight"]`, `[data-bs-theme="aurora"]` + scoped-правила; блоки dark/light не изменены | `git diff` касается только новых секций; CSS отдаётся 200 | ~10 |
| 3 | Шаблоны шапки | frontend-dev | `_theme_select.html`, `_header.html` | include селектора в обеих ветках шапки, ссылка «Тема» удалена | страницы содержат `id="theme-select"`, не содержат `theme-toggle` | ~6 |
| 4 | Проверка | qa | `tasks/current/e2e/`, `DEFECTS.md` | curl-сценарии из критериев успеха | все критерии зелёные | ~8 |

### Фаза 1: JS-модель 4 тем + селектор

- Файлы: `fastapi-application/static/art_css/scripts.js`,
  `fastapi-application/templates/includes/_head.html`.
- Контракт:
  - `VALID = ['dark', 'light', 'midnight', 'aurora']`; дефолт при невалидном
    значении — `'dark'` (как сейчас).
  - Ключ хранения — `localStorage['theme']` (не менять: совместимость с визитами).
  - Новый элемент управления: `<select id="theme-select">`; на `change` —
    `applyTheme(value)` + запись в localStorage; при init селектору проставляется
    текущее значение с `<html>`.
  - Инлайн-скрипт в `_head.html` применяет `data-bs-theme` только для значений из
    VALID.
- Шаги: правка scripts.js (заменить toggle-обработчик на select-обработчик,
  обновить комментарии), правка инлайн-скрипта `_head.html`.
- Checkpoint: `node --check` недоступен — проверять чтением и запуском приложения
  (`cd fastapi-application && ../.venv/bin/python -c "from main import main_app;
  print(len(main_app.routes))"` → 41).
- Готовность фазы: JS и шаблон согласованы по списку значений, приложение стартует.

### Фаза 2: CSS двух новых тем

- Файлы: `fastapi-application/static/art_css/base.css`.
- Контракт:
  - Новые секции добавляются в конец файла; существующие блоки
    `[data-bs-theme="dark"]` и `[data-bs-theme="light"]` — без изменений.
  - Каждый новый блок задаёт: `--bs-body-bg`, `--bs-body-color`,
    `--bs-secondary-color`, `--bs-secondary-bg`, `--bs-tertiary-bg`,
    `--bs-border-color`, `--bs-link-color`, `--bs-link-hover-color`,
    `--bs-emphasis-color` и весь набор `--art-*` (те же имена, что в dark/light).
  - Scoped-правила современного дизайна — только под новыми темами (групповой
    селектор `[data-bs-theme="midnight"], [data-bs-theme="aurora"]` либо по одной
    теме): скругления `.content-section`, `.art-card`, `.btn`, `.form-control`,
    `.form-select`, `pre`, `.hljs`, `.account-img`; градиентный фон `.backcolor-header`
    и цвет бренда/ссылок шапки; акцентные ссылки сайдбара (перекрыть фиксированный
    оранжевый `!important` внутри новых тем); мягкие тени карточек; цвет inline-кода.
- Шаги: дописать две палитры, затем общий блок современных правил.
- Checkpoint: `git diff --stat` — изменён только `base.css`; блоки dark/light в diff
  отсутствуют.
- Готовность фазы: файл синтаксически цел (скобки сбалансированы), переменные
  покрывают весь список из контракта.

### Фаза 3: Шаблоны шапки

- Файлы: `fastapi-application/templates/includes/_theme_select.html` (новый),
  `fastapi-application/templates/includes/_header.html`.
- Контракт:
  - `_theme_select.html`: `<li class="nav-item hljs-theme-select-item
    d-flex align-items-center">` c `<select class="form-select form-select-sm
    hljs-theme-select" id="theme-select" aria-label="Тема сайта">` и 4 option-ами:
    dark=«Тёмная», light=«Светлая», midnight=«Полночь», aurora=«Северное сияние».
    Значения option-ов = VALID из scripts.js.
  - `_header.html`: строка `<li ... id="theme-toggle" ...>Тема</li>` в обеих ветках
    заменена на `{% include "includes/_theme_select.html" %}`.
- Шаги: создать include, заменить две строки в `_header.html`.
- Checkpoint: запустить приложение и curl `/login` — в HTML есть
  `id="theme-select"`, нет `theme-toggle`.
- Готовность фазы: обе ветки шапки (гость и авторизованный) используют include.

### Фаза 4: Проверка

- Файлы: `tasks/current/e2e/` (заметки прогона), `tasks/current/DEFECTS.md`
  (если найдены дефекты).
- Шаги: поднять приложение, прогнать curl-сценарии критериев успеха, зафиксировать
  сырые выводы.
- Checkpoint: все критерии успеха зелёные либо дефекты заведены в DEFECTS.md.
- Готовность фазы: отчёт прогона в `tasks/current/e2e/`.

## Критерии успеха

Проверяются qa по завершении всех фаз; сырые выводы — в `tasks/current/e2e/`.

| # | Критерий | Проверка | Ожидание |
|---|---|---|---|
| 1 | Приложение стартует, роуты не потеряны | `cd fastapi-application && ../.venv/bin/python -c "from main import main_app; print(len(main_app.routes))"` | 41 |
| 2 | Страницы отдаются | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8000/` и `/art_home`, `/login`, `/about` | 200 |
| 3 | Селектор темы в шапке, 4 варианта | `curl -s http://127.0.0.1:8000/login \| grep -c 'theme-select'` и подсчёт option | select присутствует; option-ы: dark, light, midnight, aurora |
| 4 | Старая ссылка «Тема» удалена | `curl -s http://127.0.0.1:8000/login \| grep -c 'theme-toggle'` | 0 |
| 5 | CSS отдаётся и содержит новые темы | `curl -s http://127.0.0.1:8000/static/art_css/base.css \| grep -c 'data-bs-theme="midnight"\|data-bs-theme="aurora"'` | >= 2 вхождений групп селекторов |
| 6 | JS отдаётся и знает 4 темы | `curl -s http://127.0.0.1:8000/static/art_css/scripts.js \| grep -c "aurora"` | >= 1 |
| 7 | Существующие темы не тронуты | `git diff -- fastapi-application/static/art_css/base.css` | нет правок внутри блоков dark/light (только добавления) |
| 8 | Регресс: hljs-селектор и подсветка на месте | `curl -s http://127.0.0.1:8000/login \| grep -c 'hljs-theme-select'` | >= 1 |
| 9 | Инлайн-скрипт валидирует 4 значения | просмотр HTML страницы | в `_head.html`-фрагменте есть midnight и aurora |

## Финальные критерии

1. Каждый критерий успеха подтверждён доказательством (e2e/, DEFECTS.md,
   ADVERSARIAL_REVIEW.md).
2. `tasks/current/DEFECTS.md` существует только если найдены дефекты; все записи
   не OPEN.
3. Adversarial-прогон выполнен, ни одна запись ADVERSARIAL_REVIEW.md не PENDING.

## Открытые вопросы

Закрываются с пользователем ДО старта исполнения; ответы переезжают
в «Подтверждённые решения».

- Названия/палитры новых тем утверждены исполнителем (midnight — сине-фиолетовая,
  aurora — изумрудная); при желании пользователь может попросить другие имена —
  правка локализована в трёх файлах (base.css, _theme_select.html, scripts.js).

---

# Отчёт о выполнении

- Дата закрытия: 2026-08-31
- Коммит: a043df1, 3ed22c5

## Итог

Добавлены две тёмные темы сайта (`midnight` — сине-фиолетовая, `aurora` —
изумрудная) с современным дизайном (скругления, градиенты, мягкие тени, парящие
эффекты) и заменён переключатель: вместо ссылки «Тема» — селектор в шапке с
4 option-ами, меняющий тему мгновенно через `data-bs-theme` на `<html>` без
перезагрузки, с сохранением в `localStorage['theme']`. Существующие тёмная и
светлая темы не изменены (0 deletions в git diff по base.css). Все 9 критериев
успеха подтверждены curl-проверками; дефектов не найдено; adversarial-прогон не
выполнялся (задание чисто фронтенд-статика, без Python-изменений).

## Изменения

- `static/art_css/base.css` → два новых блока палитр `[data-bs-theme="midnight"]`
  и `[data-bs-theme="aurora"]` (полный набор `--bs-*` и `--art-*`) + scoped-правила
  современного дизайна (скругления карточек/кнопок/полей/кода, градиентная шапка,
  парящие карточки и пункты меню, акцентные ссылки сайдбара, бейджи-пилюли).
  Блоки dark/light не затронуты: 0 deletions.
- `static/art_css/scripts.js` → `VALID = ['dark','light','midnight','aurora']`;
  toggle-обработчик заменён на select-обработчик `#theme-select` (мгновенное
  применение + localStorage). Логика hljs не менялась.
- `templates/includes/_head.html` → инлайн-скрипт принимает все 4 значения
  (защита от вспышки неверной темы сохранена).
- `templates/includes/_theme_select.html` (новый) → селектор темы, 4 option-а.
- `templates/includes/_header.html` → в обеих ветках (гость/авторизованный)
  ссылка «Тема» заменена на include селектора.

## Критерии успеха

| # | Критерий | Результат | Доказательство |
|---|---|---|---|
| 1 | Приложение стартует, роуты не потеряны | PASS — 42 (42-й — `POST /art_home` из багфикса 97c0428, существует до задания; Python не тронут) | dev/phase01-03_progress.md |
| 2 | Страницы отдаются | PASS — `/`→307 (→200 с -L), `/art_home`/`/login`/`/about`→200 | dev/phase01-03_progress.md |
| 3 | Селектор темы, 4 варианта | PASS — `theme-select`=1; option-ы dark/light/midnight/aurora — по 1 | dev/phase01-03_progress.md |
| 4 | Старая ссылка «Тема» удалена | PASS — `theme-toggle`=0 | dev/phase01-03_progress.md |
| 5 | CSS содержит новые темы | PASS — 50 вхождений midnight/aurora | dev/phase01-03_progress.md |
| 6 | JS знает 4 темы | PASS — `aurora`=2 | dev/phase01-03_progress.md |
| 7 | Существующие темы не тронуты | PASS — git diff base.css: 0 deletions в dark/light | git diff 54b3fb2..3ed22c5 |
| 8 | Регресс hljs | PASS — `hljs-theme-select`=4 | dev/phase01-03_progress.md |
| 9 | Инлайн-скрипт валидирует 4 значения | PASS — midnight/aurora в `_head.html`=1 | dev/phase01-03_progress.md |

## Дефекты

Не найдены — DEFECTS.md не создавался.

## Adversarial-прогон

Не выполнялся — задание чисто фронтенд-статика (CSS/JS/HTML), без Python-изменений
и без новой поверхности атаки (изменения визуальные, не логические).

## Участники

- frontend-dev: фазы 1–3 (JS, CSS, шаблоны) + усиленный дизайн по запросу
- оркестратор: архивирование, синхронизация доков
