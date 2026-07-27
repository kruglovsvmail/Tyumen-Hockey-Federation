import { useEffect, useState } from 'react';
import { apiGet } from '../api/client.js';
import { getImageUrl } from '../utils/getImageUrl.js';
import { formatGameDate, formatGameTime } from '../utils/formatDate.js';
import GameScore from './DivisionDetail/GameScore.jsx';
import ArenaLink from './DivisionDetail/ArenaLink.jsx';
import '../components/DivisionDetail/DivisionDetailTabs.css';
import './WeekMatchesCarousel.css';

// Сколько карточек помещается в ряд — держим в синхроне с брейкпоинтами в CSS
// (.week-matches__viewport). От этого зависит и ширина слайда, и шаг постраничной навигации.
function useVisibleCount() {
  const getCount = () => {
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (w >= 980) return 4;
    if (w >= 720) return 2;
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

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
      <path d="M8 5.5v13l11-6.5-11-6.5z" />
    </svg>
  );
}

function MatchCard({ g }) {
  return (
    <div className="week-match-card">
      <div className="week-match-card__date">
        {formatGameDate(g.date)} · {formatGameTime(g.date)}
      </div>

      <div className="week-match-card__teams">
        <div className="week-match-card__team">
          <span>{g.homeTeam.shortName || g.homeTeam.name}</span>
          {g.homeTeam.logoUrl ? (
            <img src={getImageUrl(g.homeTeam.logoUrl)} alt="" />
          ) : (
            <span className="week-match-card__logo-placeholder" />
          )}
        </div>
        <GameScore game={g} className="week-match-card__score" />
        <div className="week-match-card__team">
          {g.awayTeam.logoUrl ? (
            <img src={getImageUrl(g.awayTeam.logoUrl)} alt="" />
          ) : (
            <span className="week-match-card__logo-placeholder" />
          )}
          <span>{g.awayTeam.shortName || g.awayTeam.name}</span>
        </div>
      </div>

      <div className="week-match-card__footer">
        <span className="week-match-card__arena">
          <ArenaLink name={g.arenaName} city={g.arenaCity} address={g.arenaAddress} />
        </span>
        {(g.videoYtUrl || g.videoVkUrl) && (
          <span className="week-match-card__streams">
            {g.videoYtUrl && (
              <a
                href={g.videoYtUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="week-match-card__stream"
                title="Онлайн-трансляция"
                onClick={(e) => e.stopPropagation()}
              >
                <PlayIcon />
              </a>
            )}
            {g.videoVkUrl && (
              <a
                href={g.videoVkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="week-match-card__stream"
                title="Онлайн-трансляция"
                onClick={(e) => e.stopPropagation()}
              >
                <PlayIcon />
              </a>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export default function WeekMatchesCarousel() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const visibleCount = useVisibleCount();

  useEffect(() => {
    apiGet('/api/championship/week-games')
      .then((data) => setGames(data.games))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(games.length / visibleCount));

  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [totalPages, page]);

  if (loading || games.length === 0) return null;

  return (
    <div className="week-matches">
      <div className="week-matches__row">
        {totalPages > 1 && (
          <button
            type="button"
            className="week-matches__nav week-matches__nav--prev"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Предыдущие матчи"
          >
            ‹
          </button>
        )}

        {/* "Окно" фиксированной ширины (visibleCount карточек) обрезает лишнее —
            внутри него едет широкая лента со ВСЕМИ матчами, translateX анимируется
            плавно (transition в CSS), так переключение страниц выглядит как свайп,
            а не мгновенная подмена карточек. */}
        <div className="week-matches__viewport">
          <div
            className="week-matches__track"
            style={{
              // Ширина ленты и translateX — в процентах от СВОЕЙ ширины (так работает
              // translateX(%) в CSS), а не от видимого окна, поэтому пересчитываем через N/V.
              width: `${(games.length / visibleCount) * 100}%`,
              transform: `translateX(-${(page * visibleCount * 100) / games.length}%)`,
            }}
          >
            {games.map((g) => (
              <div key={g.id} className="week-matches__slide" style={{ width: `${100 / games.length}%` }}>
                <MatchCard g={g} />
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <button
            type="button"
            className="week-matches__nav week-matches__nav--next"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="Следующие матчи"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
