# Фаза 2 — Стили `.markdown-content` (frontend-dev)

- **Дата:** 2026-09-02
- **Задание:** Настройка рендеринга Markdown-статей (таблицы + подсветка кода)
- **Файл правок:** `frontend/src/index.css` (единственный)

## Что сделано

В конец `frontend/src/index.css` (после `@media (prefers-reduced-motion)` для
SidePanel) добавлена одна секция с баннером
`/* === Markdown-контент (статьи блога, .markdown-content) === */`
в стиле остальных секций файла (`/* === ... === */`).

Все правила используют **только токены, существующие в файле**:

| Токен | Источник | Применение |
|---|---|---|
| `--text` | `[data-theme="*"]` | h1–h6, p, li, td, цвет inline-кода |
| `--text-muted` | `[data-theme="*"]` | h6, blockquote, дополнительные мелочи |
| `--border` | `[data-theme="*"]` | рамка table, нижние рамки th/td, левая рамка blockquote, горизонтальная линия hr, рамка inline-кода |
| `--card-bg` | `[data-theme="*"]` | фон шапки таблицы `th`, фон blockquote, фон inline-кода |
| `--link` / `--link-hover` | `[data-theme="*"]` | ссылки внутри `.markdown-content` |
| `--radius` | `:root` | скругление table, blockquote, img, inline-кода |

Темы **не трогал**, новых CSS-переменных **не вводил**.

## Какие селекторы добавлены

- `.markdown-content` — общий контейнер (line-height, переносы)
- `.markdown-content > * + *` — межблочный отступ
- `.markdown-content h1` … `.markdown-content h6` (1 общий + 6 размеров)
- `.markdown-content p`
- `.markdown-content a`, `.markdown-content a:hover`
- `.markdown-content ul`, `.markdown-content ol`, `.markdown-content li + li`
- `.markdown-content blockquote`, `.markdown-content blockquote > * + *`
- `.markdown-content hr`
- `.markdown-content img`
- `.markdown-content table` (border-collapse: separate, скругление, overflow:hidden)
- `.markdown-content th`, `.markdown-content td`
- `.markdown-content tbody tr:last-child td`
- `.markdown-content tbody tr:nth-child(even)` — зебра через `color-mix(in srgb, var(--text) 5%, transparent)`
- `.markdown-content :not(pre) > code` — inline-код (фон/рамка/скругление)
- `.markdown-content pre` (только `margin: 0` — глобальный `pre` уже даёт
  padding/border-radius/overflow-x)
- `.markdown-content pre > code` (только `font-size: 0.9rem`)

Подсветка кода **не задета**: фон блоков `pre` и дочернего `code` задают
15 hljs-тем через link-swap, как и было.

## Checkpoint-результаты

### Сборка

```
> tsc && vite build
✓ 56 modules transformed.
dist/assets/index-BATzKDJ1.css   21.86 kB │ gzip: 5.37 kB
✓ built in 3.23s
EXIT_CODE=0
```

TypeScript-проверка + Vite build без ошибок. Сырой лог: `phase02_build.txt`.

### Наличие правил в `frontend/dist/assets/*.css`

`grep -o 'markdown-content table' frontend/dist/assets/*.css` →

```
markdown-content table
```

`grep -oE '\.markdown-content[^{]*' frontend/dist/assets/*.css | sort -u`
(все 27 уникальных селекторов из блока присутствуют в собранном бандле):

```
.markdown-content
.markdown-content>*+*
.markdown-content a
.markdown-content a:hover
.markdown-content blockquote
.markdown-content blockquote>*+*
.markdown-content h1
.markdown-content h1,.markdown-content h2,.markdown-content h3,.markdown-content h4,.markdown-content h5,.markdown-content h6
.markdown-content h2
.markdown-content h3
.markdown-content h4
.markdown-content h5
.markdown-content h6
.markdown-content hr
.markdown-content img
.markdown-content li+li
.markdown-content :not(pre)>code
.markdown-content ol
.markdown-content p
.markdown-content pre
.markdown-content pre>code
.markdown-content table
.markdown-content tbody tr:last-child td
.markdown-content tbody tr:nth-child(2n)
.markdown-content th
.markdown-content th,.markdown-content td
.markdown-content ul
.markdown-content ul,.markdown-content ol
```

Критичные селекторы (`.markdown-content table`, `.markdown-content th/td`,
`.markdown-content tbody tr:nth-child(2n)`, `.markdown-content :not(pre)>code`,
`.markdown-content blockquote`, `.markdown-content pre`) — все в бандле.

## Готовность фазы 2

Зелёный checkpoint. Контракт фазы (п.2 в REQUIREMENTS.md) выполнен полностью:
читаемые таблицы (рамки `--border`, шапка `--card-bg`, зебра, скругление
`--radius`), заголовки/списки/цитаты/inline-код/img/hr на токенах тем,
блоки кода `pre` не задеты — темы hljs по-прежнему рулят.
