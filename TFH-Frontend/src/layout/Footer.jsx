import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV } from '../data/navigation.js';
import { useAdmin } from '../context/AdminContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import AdminLoginModal from '../components/AdminLoginModal.jsx';
import './Footer.css';

const COLUMNS = NAV.filter((section) => section.items);

// Иконка показывает не текущую тему, а ту, в которую переключишь — так же читается
// и подпись рядом («Тёмная тема» = «включить тёмную»)
function ThemeIcon({ toDark }) {
  return toDark ? (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a1 1 0 0 0-1.3-1.2A10.5 10.5 0 1 0 21.7 15.9a1 1 0 0 0-1.2-1.3z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 1.6v3M12 19.4v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1.6 12h3M19.4 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function Footer() {
  const { isAdmin, logout } = useAdmin();
  const { isDark, toggleTheme } = useTheme();
  const [showLogin, setShowLogin] = useState(false);

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__row">
          <div className="site-footer__brand-col">
            <div className="site-footer__brand">
              <img src="/image/logo.webp" alt="" className="site-footer__logo" />
              <div className="site-footer__brand-text">
                <span className="font-display" style={{ fontSize: 16, color: 'var(--head)', letterSpacing: 1 }}>
                  ФЕДЕРАЦИЯ ХОККЕЯ
                </span>
                <span className="site-footer__brand-sub">ТЮМЕНЬ · С 2005 ГОДА</span>
              </div>
            </div>
            <div className="site-footer__contacts">
              <a href="mailto:tgoo-fh@mail.ru">tgoo-fh@mail.ru</a>
              <a href="https://vk.ru/tglhl" target="_blank" rel="noopener noreferrer" className="site-footer__vk">
                ВКонтакте
              </a>
            </div>
          </div>

          {COLUMNS.map((section) => (
            <div key={section.key} className="site-footer__col">
              <div className="site-footer__col-title">{section.label}</div>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="site-footer__link">
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} ТГОО «Федерация Хоккея»</span>
          <div className="site-footer__actions">
            <button
              type="button"
              className="site-footer__theme-btn"
              onClick={toggleTheme}
              aria-pressed={isDark}
            >
              <ThemeIcon toDark={!isDark} />
              {isDark ? 'Светлая тема' : 'Тёмная тема'}
            </button>
            <button
              type="button"
              className="site-footer__admin-btn"
              onClick={() => (isAdmin ? logout() : setShowLogin(true))}
            >
              {isAdmin ? 'Выход' : 'Вход админ'}
            </button>
          </div>
        </div>
      </div>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
    </footer>
  );
}
