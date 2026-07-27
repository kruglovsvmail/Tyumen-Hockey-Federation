import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiSendJson, apiDelete } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import Loader from '../Loader.jsx';
import PlaceholderSection from '../PlaceholderSection.jsx';
import { formatGameDate, formatGameTime, formatDateEstimate, getPlayoffStageDisplayLabel } from '../../utils/formatDate.js';
import { getImageUrl } from '../../utils/getImageUrl.js';
import GameScore from './GameScore.jsx';
import ArenaLink from './ArenaLink.jsx';
import DateEstimatePicker from './DateEstimatePicker.jsx';
import './DivisionDetailTabs.css';

// Игры группируем по стадии (games.stage_label — туда админ в LMS вписывает и круги
// регулярки: "1-й круг", "2-й круг", и раунды плей-офф: "1/4 финала", "Финал").
// Порядок групп — по первому появлению в уже отсортированном по дате списке,
// а не алфавитный, иначе "Финал" окажется выше "1/4 финала".
//
// Группируем по ОТОБРАЖАЕМОЙ подписи (с учётом playoff_match_type), а не по сырому
// stage_label — иначе матч за 3-е место (тот же stage_label "Финал", что у настоящего
// финала) попал бы в одну группу с финалом и подписывался бы тоже "Финал".
function groupGamesByStage(games) {
  const groups = [];
  const byLabel = new Map();
  for (const g of games) {
    const label = getPlayoffStageDisplayLabel(g.stageLabel, g.playoffMatchType) || 'Матчи';
    if (!byLabel.has(label)) {
      const group = { label, games: [] };
      byLabel.set(label, group);
      groups.push(group);
    }
    byLabel.get(label).games.push(g);
  }
  return groups;
}

function GameRow({ g, isAdmin, onEditDate, onClearDate }) {
  // Тот же принцип, что в самом LMS (GameCard.jsx): games.series_number — это номер
  // и тура регулярки, и матча в серии плей-офф, подпись зависит только от stage_type.
  const metaLabel = g.seriesNumber
    ? (g.stageType === 'playoff' ? `Матч ${g.seriesNumber}` : `Тур ${g.seriesNumber}`)
    : null;

  return (
    <div className="calendar-game">
      <div className="calendar-game__meta">
        {g.date ? (
          <span className="calendar-game__date">
            {formatGameDate(g.date)} · {formatGameTime(g.date)}
          </span>
        ) : (
          <span className="calendar-game__date-row">
            <span className={`calendar-game__date ${g.dateEstimate ? 'calendar-game__date--estimate' : 'calendar-game__date--unset'}`}>
              {g.dateEstimate ? formatDateEstimate(g.dateEstimate) : 'Дата не назначена'}
            </span>
            {isAdmin && (
              <button
                type="button"
                className="calendar-game__edit-date"
                onClick={() => onEditDate(g.id)}
                aria-label="Указать прикидочную дату"
                title="Указать прикидочную дату"
              >
                ✎
              </button>
            )}
            {isAdmin && g.dateEstimate && (
              <button
                type="button"
                className="calendar-game__edit-date"
                onClick={() => onClearDate(g.id)}
                aria-label="Убрать прикидочную дату"
                title="Убрать прикидочную дату"
              >
                ✕
              </button>
            )}
          </span>
        )}
        {metaLabel && <span className="calendar-game__number">{metaLabel}</span>}
      </div>
      <div className="calendar-game__match">
        <div className="calendar-game__team calendar-game__team--home">
          <span className="calendar-game__team-name">{g.homeTeam.name}</span>
          {g.homeTeam.logoUrl ? (
            <img src={getImageUrl(g.homeTeam.logoUrl)} alt="" />
          ) : (
            <span className="calendar-game__logo-placeholder" />
          )}
        </div>
        <GameScore game={g} className="calendar-game__score" />
        <div className="calendar-game__team calendar-game__team--away">
          {g.awayTeam.logoUrl ? (
            <img src={getImageUrl(g.awayTeam.logoUrl)} alt="" />
          ) : (
            <span className="calendar-game__logo-placeholder" />
          )}
          <span className="calendar-game__team-name">{g.awayTeam.name}</span>
        </div>
      </div>
      <div className="calendar-game__arena">
        <ArenaLink name={g.arenaName} city={g.arenaCity} address={g.arenaAddress} />
      </div>
    </div>
  );
}

export default function CalendarTab({ divisionId }) {
  const { isAdmin, token } = useAdmin();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingGameId, setEditingGameId] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/championship/divisions/${divisionId}/games`)
      .then((data) => setGames(data.games))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId]);

  const stageGroups = useMemo(() => groupGamesByStage(games), [games]);

  const handleSaveEstimate = async (dates) => {
    const data = await apiSendJson(`/api/championship/games/${editingGameId}/date-estimate`, 'PUT', { dates }, token);
    setGames((prev) => prev.map((g) => (g.id === editingGameId ? { ...g, dateEstimate: data.dateEstimate } : g)));
    setEditingGameId(null);
  };

  const handleClearEstimate = async (gameId) => {
    await apiDelete(`/api/championship/games/${gameId}/date-estimate`, token);
    setGames((prev) => prev.map((g) => (g.id === gameId ? { ...g, dateEstimate: null } : g)));
  };

  if (error) return <PlaceholderSection>Не удалось загрузить календарь: {error}</PlaceholderSection>;
  if (loading) return <Loader />;
  if (games.length === 0) return <PlaceholderSection>Матчи ещё не назначены.</PlaceholderSection>;

  const editingGame = games.find((g) => g.id === editingGameId);

  return (
    <div className="calendar-tab">
      {stageGroups.map((group) => (
        <div key={group.label} className="glass-card calendar-stage">
          <h3 className="division-tab__title">{group.label}</h3>
          <div className="calendar-stage__list">
            {group.games.map((g) => (
              <GameRow
                key={g.id}
                g={g}
                isAdmin={isAdmin}
                onEditDate={setEditingGameId}
                onClearDate={handleClearEstimate}
              />
            ))}
          </div>
        </div>
      ))}

      {editingGame && (
        <DateEstimatePicker
          initialDates={editingGame.dateEstimate}
          onSave={handleSaveEstimate}
          onClose={() => setEditingGameId(null)}
        />
      )}
    </div>
  );
}
