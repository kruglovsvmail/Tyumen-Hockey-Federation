import { createContext, useContext, useEffect, useState } from 'react';

// Тот же ключ читает инлайн-скрипт в index.html — если менять, менять в обоих местах
const THEME_KEY = 'tfh_theme';

// Цвет строки состояния мобильного браузера: под фон страницы каждой темы (--pgbg)
const THEME_COLOR = { light: '#d9e7f3', dark: '#0e1822' };

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Атрибут на <html> ставит скрипт в index.html ещё до первого кадра, иначе
  // тёмная страница успевала мигнуть светлой. Здесь только подхватываем результат,
  // чтобы состояние React и разметка не разъехались.
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Системным элементам (скроллбары, поля ввода) без этого достаётся светлая
    // отрисовка поверх тёмной страницы
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.getElementById('theme-meta')?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme должен вызываться внутри ThemeProvider');
  return ctx;
}
