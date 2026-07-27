import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClampOverflow } from '../hooks/useClampOverflow.js';
import { getImageUrl } from '../utils/getImageUrl.js';

export default function DivisionCard({ division, labelWord = 'Дивизион', to }) {
  const [expanded, setExpanded] = useState(false);
  const description = division.description || '';
  const { ref: descRef, isTruncated } = useClampOverflow(description, expanded);
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (to) navigate(to);
  };

  return (
    <div
      className={`division-card${to ? ' division-card--clickable' : ''}`}
      onClick={to ? handleCardClick : undefined}
      role={to ? 'link' : undefined}
      tabIndex={to ? 0 : undefined}
      onKeyDown={to ? (e) => { if (e.key === 'Enter') handleCardClick(); } : undefined}
    >
      <div className="division-card__top">
        {division.logoUrl ? (
          <img src={getImageUrl(division.logoUrl)} alt="" className="division-card__logo" />
        ) : (
          <div className="division-card__logo division-card__logo--placeholder" />
        )}
        <div className="division-card__titles">
          <div className="division-card__name">{labelWord} {division.name}</div>
          {description && (
            <>
              <div
                ref={descRef}
                className={`division-card__description${!expanded ? ' division-card__description--clamped' : ''}`}
              >
                {description}
              </div>
              {isTruncated && (
                <button
                  type="button"
                  className="division-card__toggle"
                  onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                >
                  {expanded ? 'Свернуть' : 'Развернуть'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="division-card__stats">
        <div className="division-card__stat">
          <span className="division-card__stat-value">{division.teamCount}</span>
          <span className="division-card__stat-label">команд</span>
        </div>
        <div className="division-card__stat">
          <span className="division-card__stat-value">{division.playerCount}</span>
          <span className="division-card__stat-label">игроков</span>
        </div>
        {division.classification && <span className="division-card__badge">{division.classification}</span>}
      </div>
    </div>
  );
}
