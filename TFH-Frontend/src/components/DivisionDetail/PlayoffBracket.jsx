import { useEffect, useState } from 'react';
import { apiGet, apiSendJson } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import { getImageUrl } from '../../utils/getImageUrl.js';
import Loader from '../Loader.jsx';
import './PlayoffBracket.css';

const MATCH_BADGES = {
  place_3: '3 место',
  place_5: '5 место',
  place_7: '7 место',
  place_9: '9 место',
  place_11: '11 место',
  place_13: '13 место',
  place_15: '15 место',
};

// Место, за которое играется матч. null — обычный "путевой" матч без привязки к
// конкретному месту (регулярный проход дальше по сетке). Число — за это место играют
// (включая place_1 — сам финал тоже "играется за 1-е место").
const placeRank = (matchType) => {
  if (!matchType || matchType === 'regular') return null;
  const n = parseInt(matchType.replace('place_', ''), 10);
  return Number.isFinite(n) ? n : 99;
};

const formatWinsNeeded = (wins) => {
  if (wins === 1) return 'до 1-й победы';
  if (wins >= 2 && wins <= 4) return `до ${wins}-х побед`;
  return `до ${wins}-ти побед`;
};

// Разбиваем "путевые" матчи раунда на пары — ровно так работает сетка на выбывание:
// пара матчей одного раунда сходится в один слот следующего раунда. Нужно для отрисовки
// соединительных линий между раундами.
function pairUp(items) {
  const pairs = [];
  for (let i = 0; i < items.length; i += 2) pairs.push(items.slice(i, i + 2));
  return pairs;
}

function TeamBox({ team, wins, isWinner }) {
  return (
    <div className={`playoff-team${isWinner ? ' is-winner' : ''}`}>
      <div className="playoff-team__info">
        {team ? (
          team.logoUrl ? (
            <img src={getImageUrl(team.logoUrl)} alt="" className="playoff-team__logo" />
          ) : (
            <span className="playoff-team__logo playoff-team__logo--placeholder" />
          )
        ) : (
          <span className="playoff-team__logo playoff-team__logo--tbd">?</span>
        )}
        <span className="playoff-team__name">{team ? team.name : 'Ожидается'}</span>
      </div>
      {team && <span className="playoff-team__wins">{wins || 0}</span>}
    </div>
  );
}

// Мини-строка со счётом сыгранных матчей серии — вместо всплывающей подсказки (как в LMS):
// внутри стеклянных карточек с backdrop-filter абсолютно спозиционированный поповер
// упирается в тот же трюк со stacking context, что мы уже чинили у арены — тут проще
// показать это же прямо в потоке, компактной строкой под карточкой матча.
function MatchupScores({ matchup, games }) {
  if (!matchup.team1 || !matchup.team2) return null;
  const played = games
    .filter(
      (g) =>
        (g.homeTeamId === matchup.team1.id && g.awayTeamId === matchup.team2.id) ||
        (g.homeTeamId === matchup.team2.id && g.awayTeamId === matchup.team1.id)
    )
    .filter((g) => g.status === 'finished');

  if (played.length === 0) return null;

  const scores = played.map((g) => {
    if (g.isTechnical) return 'ТП';
    const home = g.homeTeamId === matchup.team1.id ? g.homeScore : g.awayScore;
    const away = g.homeTeamId === matchup.team1.id ? g.awayScore : g.homeScore;
    const ot = g.endType === 'ot' ? ' ОТ' : g.endType === 'so' ? ' Б' : '';
    return `${home}:${away}${ot}`;
  });

  return <div className="playoff-matchup__scores">{scores.join(', ')}</div>;
}

function MatchupCard({ matchup, games, badge }) {
  return (
    <div className="playoff-matchup">
      {badge && <div className="playoff-matchup__badge">За {badge}</div>}
      <TeamBox team={matchup.team1} wins={matchup.team1Wins} isWinner={matchup.winnerId === matchup.team1?.id} />
      <TeamBox team={matchup.team2} wins={matchup.team2Wins} isWinner={matchup.winnerId === matchup.team2?.id} />
      <MatchupScores matchup={matchup} games={games} />
    </div>
  );
}

function BracketBlock({ bracket, games, showName }) {
  // Правило — на уровне КАЖДОГО раунда, а не всей сетки целиком: если в одном раунде
  // одновременно решается несколько мест (например place_5 и place_7 — финал и утешительный
  // матч "утешительной" сетки), "путевым" (остаётся в колонке раунда, участвует в линиях)
  // считается матч за ЛУЧШЕЕ (меньшее число) место — это и есть настоящий финал ЭТОЙ сетки,
  // пусть даже он не place_1. Остальные, более "слабые" места того же раунда — не часть
  // этого пути, уводим их в отдельный ряд ниже, чтобы не путать восприятие сетки.
  const placementMatchups = [];
  const rounds = bracket.rounds.map((round) => {
    const tagged = round.matchups
      .map((m) => placeRank(m.matchType))
      .filter((r) => r !== null);
    const bestRank = tagged.length > 0 ? Math.min(...tagged) : null;

    const pathMatchups = [];
    round.matchups.forEach((m) => {
      const rank = placeRank(m.matchType);
      if (rank !== null && rank !== bestRank) placementMatchups.push(m);
      else pathMatchups.push(m);
    });
    return { ...round, pathMatchups };
  });
  placementMatchups.sort((a, b) => placeRank(a.matchType) - placeRank(b.matchType));

  return (
    <div className="playoff-bracket__grid-wrap">
      {showName && (
        <div className="playoff-bracket__name">{bracket.name}</div>
      )}

      <div className="playoff-bracket__rounds">
        {rounds.map((round, roundIdx) => (
          <div key={round.id} className="playoff-round">
            <div className="playoff-round__title">
              {round.name}
              <span className="playoff-round__subtitle">{formatWinsNeeded(round.winsNeeded)}</span>
            </div>
            <div className={`playoff-round__matchups${roundIdx < rounds.length - 1 ? ' has-next-round' : ''}`}>
              {pairUp(round.pathMatchups).map((pair, pairIdx) => (
                <div key={pairIdx} className={`playoff-pair${pair.length === 2 ? ' has-two' : ''}`}>
                  {pair.map((m) => (
                    <MatchupCard key={m.id} matchup={m} games={games} badge={MATCH_BADGES[m.matchType] || null} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {placementMatchups.length > 0 && (
        <div className="playoff-placements">
          <div className="playoff-placements__title">Матчи за места</div>
          <div className="playoff-placements__list">
            {placementMatchups.map((m) => (
              <MatchupCard key={m.id} matchup={m} games={games} badge={MATCH_BADGES[m.matchType] || null} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayoffBracket({ divisionId }) {
  const { isAdmin, token } = useAdmin();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // token передаём всегда (не только "если isAdmin") — именно по нему бэкенд узнаёт
    // администратора и решает, показывать ли скрытый от посетителей блок.
    apiGet(`/api/championship/divisions/${divisionId}/playoff`, token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId, token]);

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true);
    try {
      const result = await apiSendJson(
        `/api/championship/divisions/${divisionId}/playoff-visibility`,
        'PUT',
        { visible: !data.visible },
        token
      );
      setData((prev) => ({ ...prev, visible: result.visible }));
    } finally {
      setTogglingVisibility(false);
    }
  };

  if (loading) return <Loader />;
  if (error || !data || data.brackets.length === 0) return null;

  // Порядок блоков сеток, если их несколько (основная + утешительная и т.п.): сначала
  // главная сетка, дальше — по возрастанию места, за которое играют её матчи (5-е место
  // раньше 7-го).
  const bracketRank = (bracket) => {
    const ranks = bracket.rounds
      .flatMap((r) => r.matchups)
      .map((m) => placeRank(m.matchType))
      .filter((r) => r !== null);
    return ranks.length > 0 ? Math.min(...ranks) : Infinity;
  };
  const orderedBrackets = [...data.brackets].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return bracketRank(a) - bracketRank(b);
  });

  return (
    <div className="glass-card playoff-bracket">
      <div className="playoff-bracket__header">
        <h3 className="division-tab__title">Таблица плей-офф</h3>
        {isAdmin && (
          <button
            type="button"
            className="playoff-bracket__visibility-toggle"
            onClick={handleToggleVisibility}
            disabled={togglingVisibility}
          >
            {data.visible ? 'Скрыть от посетителей' : 'Показать посетителям'}
          </button>
        )}
      </div>

      {!data.visible && (
        <div className="playoff-bracket__hidden-notice">
          Блок скрыт от посетителей сайта — вы видите его только потому, что вошли как админ.
        </div>
      )}

      {orderedBrackets.map((bracket) => (
        <BracketBlock key={bracket.id} bracket={bracket} games={data.games} showName={orderedBrackets.length > 1} />
      ))}
    </div>
  );
}
