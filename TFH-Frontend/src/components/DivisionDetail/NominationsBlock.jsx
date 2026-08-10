import { useEffect, useState } from 'react';
import { apiGet } from '../../api/client.js';
import { getImageUrl } from '../../utils/getImageUrl.js';
import './DivisionDetailTabs.css';

const COLLAPSED_COUNT = 5;

const STAGE_LABEL = { regular: 'регулярка', playoff: 'плей-офф', all: 'регулярка + плей-офф' };

const typeLabel = (n) => {
  if (n.playerType === 'goalie') return 'вратари';
  if (n.playerType === 'all') return 'все игроки';
  if (n.positionFilter === 'forward') return 'нападающие';
  if (n.positionFilter === 'defense') return 'защитники';
  return 'полевые';
};

const formatValue = (value, format) => {
  if (value === null || value === undefined) return '—';
  if (format === 'percent') return `${(Number(value) * 100).toFixed(1)}%`;
  return Number(value);
};

function NominationCard({ nomination }) {
  const [expanded, setExpanded] = useState(false);

  const players = nomination.players || [];
  const visible = expanded ? players : players.slice(0, COLLAPSED_COUNT);
  const hiddenCount = players.length - COLLAPSED_COUNT;

  const subtitle = [
    nomination.metricLabel,
    typeLabel(nomination),
    STAGE_LABEL[nomination.stageType],
    nomination.scope === 'team' ? 'лучший в команде' : null,
    nomination.minGames > 0 ? `от ${nomination.minGames} матчей` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="glass-card nomination-card">
      <h3 className="division-tab__title nomination-card__title">{nomination.name}</h3>
      <p className="nomination-card__subtitle">{subtitle}</p>

      {players.length === 0 ? (
        <p className="nomination-card__empty">Нет игроков, подходящих под условия.</p>
      ) : (
        <>
          {/* При раскрытии список прокручивается внутри карточки: номинация на
              сотню игроков иначе растянула бы всю строку сетки */}
          <div className={`nomination-card__list${expanded ? ' nomination-card__list--scroll' : ''}`}>
            {visible.map((p, idx) => (
              <div
                key={`${p.playerId}-${p.teamId}`}
                className={`nomination-card__row${idx === 0 ? ' nomination-card__row--leader' : ''}`}
              >
                <span className="nomination-card__rank">{idx + 1}</span>

                <span className="nomination-card__avatar">
                  {p.avatarUrl ? (
                    <img src={getImageUrl(p.avatarUrl)} alt="" />
                  ) : (
                    <span className="nomination-card__avatar-placeholder" />
                  )}
                </span>

                <span className="nomination-card__person">
                  <span className="nomination-card__name" title={`${p.lastName || ''} ${p.firstName || ''}`.trim()}>
                    {`${p.lastName || ''} ${p.firstName || ''}`.trim()}
                  </span>
                  <span className="nomination-card__team">
                    {p.teamLogoUrl && <img src={getImageUrl(p.teamLogoUrl)} alt="" />}
                    <span title={p.teamName || ''}>{p.teamName || '—'}</span>
                  </span>
                </span>

                <span className="nomination-card__value">
                  <b>{formatValue(p.value, nomination.metricFormat)}</b>
                  <small>{p.gamesPlayed} игр</small>
                </span>
              </div>
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              className="nomination-card__more"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? 'Свернуть' : `Показать всех — ещё ${hiddenCount}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function NominationsBlock({ divisionId }) {
  const [nominations, setNominations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/championship/divisions/${divisionId}/nominations`)
      .then((data) => setNominations(data.nominations || []))
      .catch(() => setNominations([]))
      .finally(() => setLoading(false));
  }, [divisionId]);

  // Номинаций может не быть — это норма, а не ошибка: тогда блок не показываем
  // вовсе, чтобы не занимать место пустой рамкой. Пока грузится — тоже молчим,
  // иначе на странице мигал бы лишний спиннер под уже готовой таблицей.
  if (loading || nominations.length === 0) return null;

  return (
    <div className="nominations-grid">
      {nominations.map((n) => <NominationCard key={n.id} nomination={n} />)}
    </div>
  );
}
