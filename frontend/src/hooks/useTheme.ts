import { useCallback, useEffect, useState } from 'react';

// Тема сайта: 4 значения, ключ localStorage['theme'] сохранён от старого блога.
// Применение — атрибут data-theme на <html>, без перезагрузки страницы.
// Валидация значения из localStorage: невалидное откатывается к дефолту.

export const THEMES = ['dark', 'light', 'midnight', 'aurora'] as const;
export type Theme = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';
const DEFAULT_THEME: Theme = 'dark';

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t !== null && (THEMES as readonly string[]).includes(t)) {
      return t as Theme;
    }
  } catch {
    // localStorage может быть недоступен (приватный режим) — молча берём дефолт.
  }
  return DEFAULT_THEME;
}

// Восстановление темы при старте приложения. Хук вызывается один раз
// в Layout; повторные вызовы безопасны — состояние синхронизировано с <html>.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = useCallback((next: string) => {
    const value = (THEMES as readonly string[]).includes(next)
      ? (next as Theme)
      : DEFAULT_THEME;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore: не критично, тема применится до конца сессии
    }
    setThemeState(value);
    document.documentElement.setAttribute('data-theme', value);
  }, []);

  return { theme, setTheme };
}