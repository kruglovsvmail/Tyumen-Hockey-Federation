import { NavLink } from 'react-router-dom';
import './DropdownMenu.css';

// Открытость управляется снаружи (см. useHoverMenu) — так все выпадалки в одной группе
// (например, все пункты шапки) знают друг о друге и не остаются открытыми одновременно.
export default function DropdownMenu({ label, items, variant = 'nav', open, onEnter, onLeave }) {
  return (
    <div className="dropdown" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <div className={`dropdown__trigger dropdown__trigger--${variant}`}>{label} ▾</div>
      {open && (
        <div className={`dropdown__panel dropdown__panel--${variant}`}>
          <div className="dropdown__panel-inner">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `dropdown__item${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
