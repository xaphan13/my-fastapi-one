import { Outlet } from 'react-router-dom';
import Header from './Header';
import { useTheme } from '../hooks/useTheme';
import { useHljsTheme } from '../hooks/useHljsTheme';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { logout as apiLogout } from '../api/auth';
import type { ToastCategory } from './Toast';

// Лейаут: восстанавливает тему и hljs-тему при старте, пользователь
// приходит из AuthContext (инициализация в AuthProvider, main.tsx).
export default function Layout() {
  const { theme, setTheme } = useTheme();
  const { theme: hljsTheme, setHljsTheme } = useHljsTheme();
  const { user, setUser } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      const resp = await apiLogout();
      setUser(null);
      showToast(resp.message, resp.category as ToastCategory);
    } catch {
      // Даже если запрос не прошёл — локально пользователя сбрасываем.
      setUser(null);
      showToast('Вы вышли из аккаунта', 'message');
    }
  };

  return (
    <div className="app-shell">
      <Header
        user={user}
        theme={theme}
        onThemeChange={setTheme}
        hljsTheme={hljsTheme}
        onHljsThemeChange={setHljsTheme}
        onLogout={handleLogout}
      />
      <main className="container">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">Сайт статей о программировании</div>
      </footer>
    </div>
  );
}