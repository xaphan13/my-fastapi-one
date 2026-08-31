# Прогресс фаз 1-3 (frontend-dev)

Задание: две новые тёмные темы (midnight, aurora) и переключатель темы без перезагрузки.
Дата: 2026-08-31.

## Фаза 1: JS-модель 4 тем + селектор

- `static/art_css/scripts.js`: `VALID = ['dark', 'light', 'midnight', 'aurora']`,
  константа `DEFAULT_THEME = 'dark'`; toggle-обработчик `onThemeToggleClick` /
  `initThemeToggle` заменён на `onThemeSelectChange` / `initThemeSelect`
  (селектор `#theme-select`, мгновенное применение + запись в `localStorage['theme']`,
  чистка неизвестных option-ов, значение при init берётся с `<html>`).
  Логика hljs не менялась.
- `templates/includes/_head.html`: инлайн-скрипт принимает все 4 значения.
- Checkpoint: `python -c "from main import main_app; print(len(main_app.routes))"` → 42.

  ВАЖНО: в AGENTS.md ожидается 41. Лишний роут существует ДО моих правок —
  я не менял ни одного Python-файла (git status: только scripts.js, _head.html
  и REQUIREMENTS.md, который правился не мной). Расхождение вынесено оркестратору.

## Фаза 2: CSS двух новых тем

- `static/art_css/base.css`: дописаны в конец два блока палитр
  `[data-bs-theme="midnight"]` и `[data-bs-theme="aurora"]` (полный набор
  `--bs-*` и `--art-*`) + групповой блок современного дизайна (градиентная шапка,
  скругления карточек/кнопок/полей/кода/аватара, мягкие тени, hover-подъём карточек,
  акцентные ссылки сайдбара и бейджи, color-scheme: dark).
- Блоки dark/light не изменялись: git diff по base.css — 190 insertions, 0 deletions.
- Checkpoint: скобки сбалансированы (58/58).

## Фаза 3: шаблоны шапки

- Создан `templates/includes/_theme_select.html` (4 option-а, классы как у
  hljs-селектора, `id="theme-select"`).
- `templates/includes/_header.html`: в обеих ветках (гость/авторизованный)
  строка с `id="theme-toggle"` заменена на include селектора темы.

## Проверка (прогон, сервер 127.0.0.1:8000)

- `/` → 307 (существующий редирект, с -L → 200), `/art_home` → 200,
  `/login` → 200, `/about` → 200.
- `/login`: `id="theme-select"` — 1; option-ы dark/light/midnight/aurora — по 1;
  `theme-toggle` — 0; `hljs-theme-select` — 4 (регресс ок).
- CSS: 50 вхождений новых тем; JS: `aurora` — 2; инлайн-скрипт с midnight/aurora — 1.

Сырой вывод: /tmp/e2e_check.txt (копия ниже).

```
/ -> 307
/art_home -> 200
/login -> 200
/about -> 200
--- theme-select на /login:
1
--- option-ы селектора:
      1 <option value="aurora">
      1 <option value="dark">
      1 <option value="light">
      1 <option value="midnight">
--- theme-toggle (ожидание 0):
0
--- hljs-theme-select (регресс):
4
--- CSS новые темы:
50
--- JS aurora:
2
--- инлайн-скрипт midnight/aurora в HTML:
1
```

Сервер оставлен работать (127.0.0.1:8000) для qa/adversary.

## Дополнение (по запросу пользователя): усиленный дизайн новых тем

Пользователь попросил не ограничиваться палитрами: парящие эффекты в меню,
современная страница управления. Все правила — по-прежнему только под
`[data-bs-theme="midnight"], [data-bs-theme="aurora"]` в base.css:

- В оба блока палитр добавлены вспомогательные переменные: `--art-soft`
  (мягкий тинт), `--art-glow` (цвет свечения), `--art-grad` (фирменный градиент).
- Верхнее меню: пункты — пилюли с тинтом фона, подъёмом и свечением на hover;
  фокус-подсветка селекторов тем.
- Сайдбар: пункты превращены в кнопки-пилюли (тинт, скругление, на hover —
  подъём, свечение, цветная рамка).
- Страница управления: градиентная акцентная линия под h2 секций; таблица —
  скруглённый контейнер с тенью, тинт thead, подсветка строки на hover;
  list-group — отдельные парящие карточки (возвращена верхняя граница,
  склеенная BS); бейджи — пилюли с тенью; btn-outline-primary/success —
  градиентная заливка на hover, btn-primary — градиент всегда; алерты скруглены.
- Проверка: скобки 75/75; CSS отдаётся 200; в отдаче 11 вхождений новых
  правил; /art_home, /login, /about → 200; единственное «удаление» в git diff —
  переписанный в этом задании комментарий, блоки dark/light не тронуты.

