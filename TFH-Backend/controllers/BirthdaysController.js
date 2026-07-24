import { sharedPool } from '../config/db.js';

const LEAGUE_ID = Number(process.env.LEAGUE_ID);

// Фразы-приветствия, выбирается случайная при каждой загрузке страницы (см. ниже) —
// сама дата рождения нигде не хранится и не создаётся как новость, это виртуальный
// блок поверх новостной ленты (см. NewsPanel.jsx).
const GREETING_PHRASES = [
  'Пусть этот день принесёт только победы — на льду и в жизни!',
  'Желаем крепкого здоровья, ярких побед и семейного тепла!',
  'Пусть удача всегда будет на вашей стороне, как в решающем буллите!',
  'Счастья, успехов и новых спортивных высот в новом году жизни!',
  'Пусть каждый день будет таким же ярким, как победная шайба!',
  'Пусть в новом хоккейном сезоне жизни будет больше голов, чем штрафных минут!',
  'Пусть жизнь всегда играет в большинстве в твою пользу!',
  'С днём рождения! Пусть все шайбы жизни летят точно в цель!',
  'Желаем сил на весь сезон вперёд — и ни одной минуты на скамейке запасных!',
  'Пусть в этом году удача бросается на льду так же смело, как форвард на пустые ворота!',
  'Пусть сегодня весь лёд — твой, а победа — без овертайма!',
  'Желаем всегда выходить победителем — даже если игра идёт в меньшинстве!',
  'Пусть твой характер будет таким же крепким, как борт на стадионе!',
  'Желаем побеждать в каждой битве за шайбу, которую подбрасывает жизнь!',
  'Пусть в новом году жизни будет много красивых передач и ни одного офсайда!',
  'Желаем реализовывать буллиты судьбы на все сто процентов!',
];

export const getTodayBirthdays = async (req, res) => {
  // Показываем только тех, кто реально относится к этой лиге (игрок в составе хотя бы
  // одного дивизиона лиги, в любой момент времени, или сотрудник лиги) — таблица users
  // общая для всей платформы HockeyEco, без этого условия сюда бы попадали именинники
  // других лиг/клубов, если такие когда-нибудь заведутся на той же БД.
  const { rows } = await sharedPool.query(
    `SELECT DISTINCT u.id, u.first_name, u.last_name, u.middle_name
     FROM users u
     WHERE u.status = 'active'
       AND u.birth_date IS NOT NULL
       AND EXTRACT(MONTH FROM u.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(DAY FROM u.birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
       AND (
         EXISTS (
           SELECT 1
           FROM tournament_rosters tr
           JOIN tournament_teams tt ON tt.id = tr.tournament_team_id
           JOIN divisions d ON d.id = tt.division_id
           JOIN seasons s ON s.id = d.season_id
           WHERE tr.player_id = u.id AND s.league_id = $1
         )
         OR EXISTS (
           SELECT 1 FROM league_staff ls WHERE ls.user_id = u.id AND ls.league_id = $1
         )
       )
     ORDER BY u.last_name, u.first_name`,
    [LEAGUE_ID]
  );

  const today = new Date();
  const greeting = GREETING_PHRASES[Math.floor(Math.random() * GREETING_PHRASES.length)];

  res.json({
    date: today.toISOString(),
    greeting,
    users: rows.map((r) => ({
      fullName: [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' '),
    })),
  });
};
