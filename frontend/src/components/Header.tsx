import { NavLink, Link } from 'react-router-dom';
import ThemeSelect from './ThemeSelect';
import HljsThemeSelect from './HljsThemeSelect';
import type { Theme } from '../hooks/useTheme';
import type { User } from '../types';

interface HeaderProps {
  user: User | null;
  theme: Theme;
  onThemeChange: (theme: string) => void;
  hljsTheme: string;
  onHljsThemeChange: (theme: string) => void;
  onLogout: () => void;
}

// Шапка сайта: навигация, селекторы темы и подсветки кода.
// Пользователь приходит из AuthContext (прокидывается Layout),
// кнопка «Выход» вызывает POST /api/blog/logout через Layout.
export default function Header({
  user,
  theme,
  onThemeChange,
  hljsTheme,
  onHljsThemeChange,
  onLogout,
}: HeaderProps) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-link active' : 'nav-link';

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          Сайт о программировании
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end className={navClass}>
            Статьи
          </NavLink>
          <NavLink to="/art_manage" className={navClass}>
            Управление
          </NavLink>
          {user ? (
            <>
              <NavLink to="/account" className={navClass}>
                Аккаунт
              </NavLink>
              <button type="button" className="nav-link as-button" onClick={onLogout}>
                Выход
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={navClass}>
                Вход
              </NavLink>
              <NavLink to="/register" className={navClass}>
                Регистрация
              </NavLink>
            </>
          )}
          <NavLink to="/about" className={navClass}>
            О сайте
          </NavLink>
        </nav>

        <div className="header-selects">
          <ThemeSelect theme={theme} onChange={onThemeChange} />
          <HljsThemeSelect theme={hljsTheme} onChange={onHljsThemeChange} />
        </div>
      </div>
    </header>
  );
}