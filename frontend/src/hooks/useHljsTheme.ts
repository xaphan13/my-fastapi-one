import { useCallback, useEffect, useState } from 'react';

// Тема подсветки кода highlight.js: 15 тёмных тем, тот же список, что в старом
// блоге (_hljs_theme_select.html / scripts.js). Активная <link data-hljs-dark>
// переключается по атрибуту disabled — swap без перезагрузки.
// Код всегда на тёмном фоне в любой теме сайта: светлая ссылка (vs) всегда
// disabled. Ключ localStorage['hljs-theme'] сохранён, дефолт vs2015.

export const HLJS_DARK_THEMES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'vs2015', label: 'VS Code' },
  { id: 'github-dark', label: 'GitHub Dark' },
  { id: 'github-dark-dimmed', label: 'GitHub Dark Dimmed' },
  { id: 'atom-one-dark', label: 'Atom One Dark' },
  { id: 'monokai', label: 'Monokai' },
  { id: 'monokai-sublime', label: 'Monokai Sublime' },
  { id: 'nord', label: 'Nord' },
  { id: 'paraiso-dark', label: 'Paraiso Dark' },
  { id: 'stackoverflow-dark', label: 'StackOverflow Dark' },
  { id: 'tokyo-night-dark', label: 'Tokyo Night Dark' },
  { id: 'gradient-dark', label: 'Gradient Dark' },
  { id: 'night-owl', label: 'Night Owl' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'shades-of-purple', label: 'Shades of Purple' },
  { id: 'ir-black', label: 'Ir Black' },
];

export const HLJS_DEFAULT = 'vs2015';
export const HLJS_LIGHT_ID = 'vs';

const STORAGE_KEY = 'hljs-theme';
const DARK_IDS = HLJS_DARK_THEMES.map((t) => t.id);

function readHljsTheme(): string {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t !== null && DARK_IDS.includes(t)) return t;
  } catch {
    // ignore: localStorage недоступен — берём дефолт
  }
  return HLJS_DEFAULT;
}

// Включает ровно одну тёмную hljs-таблицу (выбранную), остальные и светлую — disabled.
function syncLinks(chosen: string) {
  const light = document.getElementById(`hljs-theme-${HLJS_LIGHT_ID}`) as HTMLLinkElement | null;
  const darkLinks = document.querySelectorAll<HTMLLinkElement>('link[data-hljs-dark]');
  if (light) light.disabled = true;
  darkLinks.forEach((link) => {
    const id = link.id.replace(/^hljs-theme-/, '');
    link.disabled = id !== chosen;
  });
}

export function useHljsTheme() {
  const [theme, setThemeState] = useState<string>(readHljsTheme);

  const setHljsTheme = useCallback((next: string) => {
    const value = DARK_IDS.includes(next) ? next : HLJS_DEFAULT;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore: не критично
    }
    setThemeState(value);
    syncLinks(value);
  }, []);

  // Одноразовая синхронизация при маунте: без неё сохранённая тема из localStorage
  // не применяется к link-элементам после перезагрузки (остаётся дефолт vs2015).
  useEffect(() => {
    syncLinks(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { theme, setHljsTheme };
}