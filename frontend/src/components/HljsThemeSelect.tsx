import { HLJS_DARK_THEMES } from '../hooks/useHljsTheme';

interface HljsThemeSelectProps {
  theme: string;
  onChange: (theme: string) => void;
}

// Селектор тёмной темы подсветки кода highlight.js. Список — те же 15 тем,
// что были в селекторе старого блога; setHljsTheme из useHljsTheme делает
// swap активной <link data-hljs-dark> по disabled и пишет
// localStorage['hljs-theme'].
export default function HljsThemeSelect({ theme, onChange }: HljsThemeSelectProps) {
  return (
    <select
      aria-label="Тема подсветки кода"
      className="theme-select"
      value={theme}
      onChange={(e) => onChange(e.target.value)}
    >
      {HLJS_DARK_THEMES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.label}
        </option>
      ))}
    </select>
  );
}