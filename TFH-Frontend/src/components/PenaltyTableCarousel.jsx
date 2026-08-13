import { useEffect, useState } from 'react';
import PhotoLightbox from './PhotoLightbox.jsx';

// Сколько блоков помещается в ряд — держим в синхроне с брейкпоинтами в CSS
// (.penalty-carousel__viewport). От этого зависит и ширина слайда, и шаг листания.
function useVisibleCount() {
  const getCount = () => {
    if (typeof window === 'undefined') return 5;
    const w = window.innerWidth;
    if (w >= 1200) return 5;
    if (w >= 980) return 4;
    if (w >= 720) return 3;
    if (w >= 520) return 2;
    return 1;
  };

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const onResize = () => setCount(getCount());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return count;
}

/**
 * Лента блоков таблицы штрафов. Механика листания повторяет карусель матчей
 * на главной: окно фиксированной ширины обрезает широкую ленту, страницы
 * переключаются сдвигом с анимацией, а не подменой карточек.
 *
 * В блоке только изображение, без подписи. Клик открывает его во весь экран.
 */
export default function PenaltyTableCarousel({ images, isAdmin, onDelete }) {
  const [page, setPage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const visibleCount = useVisibleCount();

  const totalPages = Math.max(1, Math.ceil(images.length / visibleCount));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  if (images.length === 0) return null;

  return (
    <div className="penalty-carousel">
      <div className="penalty-carousel__row">
        {totalPages > 1 && (
          <button
            type="button"
            className="penalty-carousel__nav penalty-carousel__nav--prev"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Предыдущие"
          >
            ‹
          </button>
        )}

        <div className="penalty-carousel__viewport">
          <div
            className="penalty-carousel__track"
            style={{
              // Ширина ленты и сдвиг — в процентах от собственной ширины ленты
              // (так работает translateX в процентах), поэтому пересчитываем через N/V
              width: `${(images.length / visibleCount) * 100}%`,
              transform: `translateX(-${(page * visibleCount * 100) / images.length}%)`,
            }}
          >
            {images.map((image, index) => (
              <div
                key={image.id}
                className="penalty-carousel__slide"
                style={{ width: `${100 / images.length}%` }}
              >
                <div className="penalty-card">
                  <button
                    type="button"
                    className="penalty-card__open"
                    onClick={() => setLightboxIndex(index)}
                    aria-label="Открыть изображение"
                  >
                    <img src={image.url} alt="" loading="lazy" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="penalty-card__delete"
                      onClick={() => onDelete(image)}
                      aria-label="Удалить изображение"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <button
            type="button"
            className="penalty-carousel__nav penalty-carousel__nav--next"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="Следующие"
          >
            ›
          </button>
        )}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}
