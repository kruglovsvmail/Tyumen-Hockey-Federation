import { useEffect, useState } from 'react';
import { apiGet } from '../../api/client.js';
import { getImageUrl } from '../../utils/getImageUrl.js';
import './DivisionDetailTabs.css';

// Карточка показывает только верх списка, без раскрытия: полный рейтинг на
// витрине не нужен, а одинаковая высота карточек держит сетку ровной. Поэтому
// строк всегда пять: сервер отдаёт только игроков с результатом, а свободные
// места занимают пустые строки-заглушки.
const VISIBLE_COUNT = 5;

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
  const players = (nomination.players || []).slice(0, VISIBLE_COUNT);
  const emptySlots = VISIBLE_COUNT - players.length;

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
      <p className="nomination-card__subtitle" title={subtitle}>{subtitle}</p>

      <div className="nomination-card__list">
        {players.map((p, idx) => (
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

        {/* Место, на которое пока никто не набрал результата */}
        {Array.from({ length: emptySlots }, (_, i) => (
          <div key={`empty-${i}`} className="nomination-card__row nomination-card__row--empty">
            <span className="nomination-card__rank">{players.length + i + 1}</span>
            <span className="nomination-card__avatar" />
            <span className="nomination-card__person">
              <span className="nomination-card__name">—</span>
            </span>
            <span className="nomination-card__value" />
          </div>
        ))}
      </div>
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
