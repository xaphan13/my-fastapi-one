import { THEMES, type Theme } from '../hooks/useTheme';

const THEME_LABELS: Record<Theme, string> = {
  dark: 'Тёмная',
  light: 'Светлая',
  midnight: 'Полночь',
  aurora: 'Аврора',
};

interface ThemeSelectProps {
  theme: Theme;
  onChange: (theme: string) => void;
}

// Селектор темы сайта в шапке. Применение мгновенное: setTheme из useTheme
// меняет data-theme на <html> и пишет localStorage['theme'].
export default function ThemeSelect({ theme, onChange }: ThemeSelectProps) {
  return (
    <select
      aria-label="Тема сайта"
      className="theme-select"
      value={theme}
      onChange={(e) => onChange(e.target.value)}
    >
      {THEMES.map((t) => (
        <option key={t} value={t}>
          {THEME_LABELS[t]}
        </option>
      ))}
    </select>
  );
}