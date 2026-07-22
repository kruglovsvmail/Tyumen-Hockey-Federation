import { NavLink } from 'react-router-dom';
import DropdownMenu from '../components/DropdownMenu.jsx';
import NewsPanel from '../components/NewsPanel.jsx';
import { useHoverMenu } from '../hooks/useHoverMenu.js';
import { NAV } from '../data/navigation.js';

export default function HomePage() {
  const { openKey, handleEnter, handleLeave } = useHoverMenu();

  return (
    <div className="page-container">
      <div className="hero">
        <img src="/image/logo.webp" alt="" className="hero__logo" />
        <h1 className="hero__title font-display">
          ТЮМЕНСКАЯ ГОРОДСКАЯ ОБЩЕСТВЕННАЯ ОРГАНИЗАЦИЯ «ФЕДЕРАЦИЯ ХОККЕЯ»
        </h1>
      </div>

      <div className="hero__pills">
        {NAV.map((section) =>
          section.items ? (
            <DropdownMenu
              key={section.key}
              label={section.label}
              items={section.items}
              variant="hero"
              open={openKey === section.key}
              onEnter={() => handleEnter(section.key)}
              onLeave={handleLeave}
            />
          ) : (
            <NavLink key={section.key} to={section.to} className="hero__pill-link">
              {section.label}
            </NavLink>
          )
        )}
      </div>

      <NewsPanel />
    </div>
  );
}
