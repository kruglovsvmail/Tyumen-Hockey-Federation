// Тот же принцип отображения счёта, что в LMS (GameCard.jsx):
//  - games.is_technical ('+/-', '-/-', '-/+') — технический результат, показываем как есть;
//  - иначе обычный счёт, а если матч решился в овертайме/буллитах (end_type='ot'/'so') —
//    рядом со счётом победившей стороны показываем "ОТ"/"Б".
export default function GameScore({ game, className = '' }) {
  const isFinished = game.status === 'finished' || game.status === 'finished_no_result';
  const cls = `game-score ${className}`.trim();

  if (!isFinished) {
    return <span className={cls}>–:–</span>;
  }

  if (game.isTechnical) {
    const [home, away] = String(game.isTechnical).split('/');
    return (
      <span className={`${cls} game-score--technical`} title="Технический результат">
        {home}:{away}
      </span>
    );
  }

  const extraLabel = game.endType === 'so' ? 'Б' : game.endType === 'ot' ? 'ОТ' : null;
  const homeWon = game.homeScore > game.awayScore;
  const awayWon = game.awayScore > game.homeScore;

  return (
    <span className={cls}>
      {homeWon && extraLabel && <span className="game-score__extra game-score__extra--left">{extraLabel}</span>}
      {game.homeScore}:{game.awayScore}
      {awayWon && extraLabel && <span className="game-score__extra game-score__extra--right">{extraLabel}</span>}
    </span>
  );
}
