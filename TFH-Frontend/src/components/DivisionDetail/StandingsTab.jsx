import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client.js';
import Loader from '../Loader.jsx';
import PlaceholderSection from '../PlaceholderSection.jsx';
import { formatGameDate, formatGameTime } from '../../utils/formatDate.js';
import { getImageUrl } from '../../utils/getImageUrl.js';
import GameScore from './GameScore.jsx';
import ArenaLink from './ArenaLink.jsx';
import PlayoffBracket from './PlayoffBracket.jsx';
import { useScrollCarousel } from '../../hooks/useScrollCarousel.js';
import './DivisionDetailTabs.css';

function TeamCell({ team, teamLinkBase }) {
  const content = (
    <>
      <div className="standings-tab__logo-wrap">
        {team.logoUrl ? (
          <img src={getImageUrl(team.logoUrl)} alt="" className="standings-tab__logo" />
        ) : (
          <div className="standings-tab__logo standings-tab__logo--placeholder" />
        )}
      </div>
      <span className="standings-tab__team-name">{team.name}</span>
    </>
  );
  if (!teamLinkBase) return <div className="standings-tab__team-cell">{content}</div>;
  return (
    <Link to={`${teamLinkBase}/${team.tournamentTeamId || team.teamId}`} className="standings-tab__team-cell standings-tab__team-cell--link">
      {content}
    </Link>
  );
}

export default function StandingsTab({ divisionId, teamLinkBase }) {
  const [standings, setStandings] = useState([]);
  const [weekGames, setWeekGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const weekGamesListRef = useRef(null);
  const { canScrollUp, canScrollDown, scrollUp, scrollDown } = useScrollCarousel(weekGamesListRef, [weekGames.length]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiGet(`/api/championship/divisions/${divisionId}/standings`),
      apiGet(`/api/championship/divisions/${divisionId}/week-games`),
    ])
      .then(([standingsData, weekData]) => {
        setStandings(standingsData.standings);
        setWeekGames(weekData.games);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId]);

  if (error) return <PlaceholderSection>Не удалось загрузить таблицу: {error}</PlaceholderSection>;
  if (loading) return <Loader />;

  return (
    <div className="division-tab-page">
      <div className="division-tab-layout">
        <div className="glass-card standings-tab">
          <h3 className="division-tab__title">Таблица регулярного чемпионата</h3>

          {standings.length === 0 ? (
            <PlaceholderSection>В дивизионе пока нет допущенных команд.</PlaceholderSection>
          ) : (
            <div className="standings-tab__table-wrap">
              <table className="standings-tab__table">
                <thead>
                  <tr>
                    <th className="standings-tab__col-num">№</th>
                    <th className="standings-tab__col-team">Команда</th>
                    <th>И</th>
                    <th>В</th>
                    <th>Н</th>
                    <th>П</th>
                    <th>Шайбы</th>
                    <th>О</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, idx) => (
                    <tr key={s.teamId}>
                      <td className="standings-tab__col-num">{idx + 1}</td>
                      <td className="standings-tab__col-team">
                        <TeamCell team={s} teamLinkBase={teamLinkBase} />
                      </td>
                      <td>{s.gamesPlayed}</td>
                      <td>{s.winsReg + s.winsOt}</td>
                      <td>{s.draws}</td>
                      <td>{s.lossesReg + s.lossesOt}</td>
                      <td>{s.goalsFor}–{s.goalsAgainst}</td>
                      <td className="standings-tab__points">{s.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="glass-card week-games">
          <div className="week-games__header">
            <h3 className="division-tab__title">Предстоящие матчи</h3>
            {(canScrollUp || canScrollDown) && (
              <div className="week-games__nav">
                <button
                  type="button"
                  className="week-games__nav-btn"
                  onClick={scrollUp}
                  disabled={!canScrollUp}
                  aria-label="Прокрутить вверх"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="week-games__nav-btn"
                  onClick={scrollDown}
                  disabled={!canScrollDown}
                  aria-label="Прокрутить вниз"
                >
                  ↓
                </button>
              </div>
            )}
          </div>
          {weekGames.length === 0 ? (
            <p className="week-games__empty">На этой неделе матчей нет.</p>
          ) : (
            <div className="week-games__list" ref={weekGamesListRef}>
              {weekGames.map((g) => (
                <div key={g.id} className="week-games__item">
                  <span className="week-games__date">
                    {formatGameDate(g.date)} · {formatGameTime(g.date)}
                  </span>
                  <div className="week-games__match">
                    <span className="week-games__team">{g.homeTeam.shortName || g.homeTeam.name}</span>
                    {g.homeTeam.logoUrl ? <img src={getImageUrl(g.homeTeam.logoUrl)} alt="" /> : <span className="week-games__logo-placeholder" />}
                    <GameScore game={g} className="week-games__score" />
                    {g.awayTeam.logoUrl ? <img src={getImageUrl(g.awayTeam.logoUrl)} alt="" /> : <span className="week-games__logo-placeholder" />}
                    <span className="week-games__team">{g.awayTeam.shortName || g.awayTeam.name}</span>
                  </div>
                  <span className="week-games__arena">
                    <ArenaLink name={g.arenaName} city={g.arenaCity} address={g.arenaAddress} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PlayoffBracket divisionId={divisionId} />
    </div>
  );
}
