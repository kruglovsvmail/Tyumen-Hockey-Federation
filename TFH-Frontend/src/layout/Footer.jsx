import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV } from '../data/navigation.js';
import { useAdmin } from '../context/AdminContext.jsx';
import AdminLoginModal from '../components/AdminLoginModal.jsx';
import './Footer.css';

const COLUMNS = NAV.filter((section) => section.items);

export default function Footer() {
  const { isAdmin, logout } = useAdmin();
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
          <button
            type="button"
            className="site-footer__admin-btn"
            onClick={() => (isAdmin ? logout() : setShowLogin(true))}
          >
            {isAdmin ? 'Выход' : 'Вход админ'}
          </button>
        </div>
      </div>

      {showLogin && <AdminLoginModal onClose={() => setShowLogin(false)} />}
    </footer>
  );
}
