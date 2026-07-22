import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './PhotoLightbox.css';

// Полноэкранная карусель просмотра: стрелки клавиатуры, Esc для закрытия, счётчик N / M
export default function PhotoLightbox({ photos, index, title, onClose, onIndexChange }) {
  const total = photos.length;
  const current = photos[index];

  const goPrev = () => onIndexChange((index - 1 + total) % total);
  const goNext = () => onIndexChange((index + 1) % total);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  if (!current) return null;

  return createPortal(
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Закрыть">
        ✕
      </button>

      <div className="lightbox-counter">
        {title ? `${title} — ` : ''}
        {index + 1} / {total}
      </div>

      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav--prev"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Предыдущее фото"
        >
          ‹
        </button>
      )}

      <img src={current.url} alt="" className="lightbox-image" onClick={(e) => e.stopPropagation()} />

      {total > 1 && (
        <button
          type="button"
          className="lightbox-nav lightbox-nav--next"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Следующее фото"
        >
          ›
        </button>
      )}
    </div>,
    document.body
  );
}
