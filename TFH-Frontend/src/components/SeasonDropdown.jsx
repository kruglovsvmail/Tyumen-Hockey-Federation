import { useEffect, useRef, useState } from 'react';

// Пилюля с выпадающей панелью в стиле пунктов шапки (DropdownMenu), но открывается по клику,
// а не по hover — это выбор значения, а не навигация, кликом надёжнее (в том числе на тач-экранах).
export default function SeasonDropdown({ seasons, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = seasons.find((s) => s.id === value);

  return (
    <div className="season-dropdown" ref={rootRef}>
      <button type="button" className="season-dropdown__trigger" onClick={() => setOpen((v) => !v)}>
        Сезон {current ? current.name : ''} ▾
      </button>
      {open && (
        <div className="season-dropdown__panel">
          <div className="season-dropdown__panel-inner">
            {seasons.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`season-dropdown__item${s.id === value ? ' is-active' : ''}`}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
