import { NavLink } from 'react-router-dom';
import DropdownMenu from '../components/DropdownMenu.jsx';
import { useHoverMenu } from '../hooks/useHoverMenu.js';
import { NAV } from '../data/navigation.js';
import './Header.css';

export default function Header({ visible = true }) {
  const { openKey, handleEnter, handleLeave } = useHoverMenu();

  return (
    <header className={`site-header${visible ? '' : ' site-header--hidden'}`}>
      <div className="site-header__bar">
        <NavLink to="/" end className="site-header__brand">
          <img src="/image/logo.webp" alt="Логотип федерации" className="site-header__logo" />
          <div className="site-header__brand-text">
            <span className="site-header__title font-display">ФЕДЕРАЦИЯ ХОККЕЯ</span>
            <span className="site-header__subtitle">ТЮМЕНСКАЯ ГОРОДСКАЯ ОБЩЕСТВЕННАЯ ОРГАНИЗАЦИЯ</span>
          </div>
        </NavLink>
        <div className="site-header__spacer" />
        <nav className="site-header__nav">
          {NAV.map((section) =>
            section.items ? (
              <DropdownMenu
                key={section.key}
                label={section.label}
                items={section.items}
                variant="nav"
                open={openKey === section.key}
                onEnter={() => handleEnter(section.key)}
                onLeave={handleLeave}
              />
            ) : (
              <NavLink
                key={section.key}
                to={section.to}
                className={({ isActive }) => `site-header__link${isActive ? ' is-active' : ''}`}
              >
                {section.label}
              </NavLink>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
