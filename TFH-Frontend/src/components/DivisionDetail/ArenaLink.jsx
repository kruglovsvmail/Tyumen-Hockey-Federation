import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Название арены кликабельно — по нажатию всплывает подсказка с городом и адресом.
// Рендерим подсказку порталом прямо в body, а не рядом в DOM: карточки календаря
// используют backdrop-filter, а он создаёт свой контекст наложения — z-index внутри
// одной карточки физически не может перекрыть соседнюю карточку ниже. Портал решает
// это раз и навсегда — подсказка всегда поверх всего, независимо от разметки вокруг.
export default function ArenaLink({ name, city, address }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const close = () => setOpen(false);
    const handleClickOutside = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
        close();
      }
    };
    // Координаты снимаются один раз при открытии; при скролле/резайзе — просто закрываем,
    // а не пересчитываем на лету (подсказка простая, недолговечная).
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 10, left: rect.left + rect.width / 2 });
    }
    setOpen((v) => !v);
  };

  if (!name) return <span className="arena-link arena-link--empty">Арена не указана</span>;
  if (!city && !address) return <span className="arena-link">{name}</span>;

  return (
    <>
      <button type="button" ref={btnRef} className="arena-link arena-link--clickable" onClick={handleToggle}>
        {name}
      </button>
      {open && coords &&
        createPortal(
          <div ref={popoverRef} className="arena-popover" style={{ top: coords.top, left: coords.left }}>
            <div className="arena-popover__name">{name}</div>
            {city && <div className="arena-popover__city">{city}</div>}
            {address && <div className="arena-popover__address">{address}</div>}
          </div>,
          document.body
        )}
    </>
  );
}
