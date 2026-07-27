import jwt from 'jsonwebtoken';
import { sharedPool, tfhPool } from '../config/db.js';

// Мягкая проверка токена — в отличие от middleware/auth.js не роняет запрос при
// отсутствии/невалидности токена, просто считает запрос анонимным. Нужна там, где
// один и тот же публичный GET должен по-разному себя вести для админа (видит скрытые
// от посетителей блоки) и для обычного посетителя, но при этом остаётся доступен без токена.
const isRequestFromAdmin = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

// Раздел "Чемпионат" на сайте ТФХ разбит на 3 подраздела не по одному дивизиону,
// а по группе классификаций (divisions.classification в общей БД LMS/TR).
// В базе classification хранится с кавычками-ёлочками (см. divisions.classification) — сверяем как есть
const CLASSIFICATION_GROUPS = {
  master: ['«Мастер 18»', '«Мастер 40»'],
  lubitel: ['«Любитель»', '«Любитель У»'],
  vip: ['«VIP»'],
};

const LEAGUE_ID = Number(process.env.LEAGUE_ID);

export const getSeasons = async (req, res) => {
  const { rows } = await sharedPool.query(
    `SELECT id, name, start_date, end_date, is_active
     FROM seasons
     WHERE league_id = $1
     ORDER BY start_date DESC NULLS LAST, id DESC`,
    [LEAGUE_ID]
  );

  res.json({
    seasons: rows.map((r) => ({
      id: r.id,
      name: r.name,
      startDate: r.start_date,
      endDate: r.end_date,
      isActive: r.is_active,
    })),
  });
};

export const getDivisions = async (req, res) => {
  const { group, seasonId } = req.query;
  const classifications = CLASSIFICATION_GROUPS[group];

  if (!classifications) {
    return res.status(400).json({ message: 'Неизвестная группа дивизионов' });
  }
  if (!seasonId) {
    return res.status(400).json({ message: 'Не передан seasonId' });
  }

  const { rows } = await sharedPool.query(
    `SELECT
       d.id,
       d.name,
       d.short_name,
       d.logo_url,
       d.description,
       d.classification,
       COUNT(DISTINCT tt.id) FILTER (WHERE tt.status = 'approved') AS team_count,
       COUNT(DISTINCT tr.player_id) FILTER (
         WHERE tt.status = 'approved' AND tr.application_status = 'approved' AND tr.period_end IS NULL
       ) AS player_count
     FROM divisions d
     LEFT JOIN tournament_teams tt ON tt.division_id = d.id
     LEFT JOIN tournament_rosters tr ON tr.tournament_team_id = tt.id
     WHERE d.season_id = $1
       AND d.classification = ANY($2::text[])
       AND d.is_published = true
       AND d.is_tournament IS NOT TRUE
     GROUP BY d.id
     ORDER BY d.id`,
    [seasonId, classifications]
  );

  res.json({
    divisions: rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.short_name,
      logoUrl: r.logo_url,
      description: r.description,
      classification: r.classification,
      teamCount: Number(r.team_count),
      playerCount: Number(r.player_count),
    })),
  });
};

// "Турниры" — отдельный плоский раздел (без разбивки по classification, в отличие от
// "Чемпионата"): сюда попадают дивизионы с divisions.is_tournament = true — по сути та же
// сущность в БД, просто с другим отображаемым названием и другим местом на сайте.
export const getTournaments = async (req, res) => {
  const { seasonId } = req.query;

  if (!seasonId) {
    return res.status(400).json({ message: 'Не передан seasonId' });
  }

  const { rows } = await sharedPool.query(
    `SELECT
       d.id,
       d.name,
       d.short_name,
       d.logo_url,
       d.description,
       d.classification,
       COUNT(DISTINCT tt.id) FILTER (WHERE tt.status = 'approved') AS team_count,
       COUNT(DISTINCT tr.player_id) FILTER (
         WHERE tt.status = 'approved' AND tr.application_status = 'approved' AND tr.period_end IS NULL
       ) AS player_count
     FROM divisions d
     LEFT JOIN tournament_teams tt ON tt.division_id = d.id
     LEFT JOIN tournament_rosters tr ON tr.tournament_team_id = tt.id
     WHERE d.season_id = $1
       AND d.is_tournament = true
       AND d.is_published = true
     GROUP BY d.id
     ORDER BY d.id`,
    [seasonId]
  );

  res.json({
    tournaments: rows.map((r) => ({
      id: r.id,
      name: r.name,
      shortName: r.short_name,
      logoUrl: r.logo_url,
      description: r.description,
      classification: r.classification,
      teamCount: Number(r.team_count),
      playerCount: Number(r.player_count),
    })),
  });
};

// ==========================================
//        СТРАНИЦА ДИВИЗИОНА / ТУРНИРА
// ==========================================
// Дивизионы и турниры — одна и та же сущность (divisions.is_tournament), поэтому
// детальная страница и её вкладки используют общие эндпоинты вне зависимости от того,
// с "Чемпионата" или с "Турниров" на неё попали.

export const getDivisionDetail = async (req, res) => {
  const { id } = req.params;

  const { rows } = await sharedPool.query(
    `SELECT d.id, d.name, d.short_name, d.logo_url, d.description, d.classification,
            d.is_tournament, s.name AS season_name
     FROM divisions d
     JOIN seasons s ON s.id = d.season_id
     WHERE d.id = $1 AND d.is_published = true`,
    [id]
  );

  const d = rows[0];
  if (!d) return res.status(404).json({ message: 'Не найдено' });

  res.json({
    division: {
      id: d.id,
      name: d.name,
      shortName: d.short_name,
      logoUrl: d.logo_url,
      description: d.description,
      classification: d.classification,
      isTournament: d.is_tournament,
      seasonName: d.season_name,
    },
  });
};

// Турнирная таблица. LEFT JOIN на division_standings (а не только чтение готовой таблицы) —
// подстраховка на случай, если для какой-то допущенной команды строка ещё не посчиталась
// (см. недавний фикс пересчёта при допуске в tournamentTeamController.js): такая команда
// всё равно попадёт в список с нулевой статистикой, а не пропадёт молча.
export const getDivisionStandings = async (req, res) => {
  const { id } = req.params;

  const divRows = await sharedPool.query(
    `SELECT id FROM divisions WHERE id = $1 AND is_published = true`,
    [id]
  );
  if (divRows.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

  const { rows } = await sharedPool.query(
    `SELECT
       tt.id AS tournament_team_id, t.id AS team_id, t.name, t.short_name, t.logo_url,
       COALESCE(ds.games_played, 0) AS games_played,
       COALESCE(ds.wins_reg, 0) AS wins_reg,
       COALESCE(ds.wins_ot, 0) AS wins_ot,
       COALESCE(ds.draws, 0) AS draws,
       COALESCE(ds.losses_ot, 0) AS losses_ot,
       COALESCE(ds.losses_reg, 0) AS losses_reg,
       COALESCE(ds.goals_for, 0) AS goals_for,
       COALESCE(ds.goals_against, 0) AS goals_against,
       COALESCE(ds.points, 0) AS points,
       ds.rank
     FROM tournament_teams tt
     JOIN teams t ON t.id = tt.team_id
     LEFT JOIN division_standings ds ON ds.division_id = tt.division_id AND ds.team_id = tt.team_id
     WHERE tt.division_id = $1 AND tt.status = 'approved'
     ORDER BY COALESCE(ds.rank, 999999), ds.points DESC NULLS LAST, t.name`,
    [id]
  );

  res.json({
    standings: rows.map((r, idx) => ({
      tournamentTeamId: r.tournament_team_id,
      teamId: r.team_id,
      name: r.name,
      shortName: r.short_name,
      logoUrl: r.logo_url,
      gamesPlayed: Number(r.games_played),
      winsReg: Number(r.wins_reg),
      winsOt: Number(r.wins_ot),
      draws: Number(r.draws),
      lossesOt: Number(r.losses_ot),
      lossesReg: Number(r.losses_reg),
      goalsFor: Number(r.goals_for),
      goalsAgainst: Number(r.goals_against),
      points: Number(r.points),
      rank: r.rank || idx + 1,
    })),
  });
};

const GAMES_SELECT = `
  SELECT
    g.id, g.game_date, g.division_id, g.stage_type, g.stage_label, g.playoff_match_type,
    g.game_number, g.series_number,
    g.status, g.home_score, g.away_score, g.is_technical, g.end_type,
    g.video_yt_url, g.video_vk_url,
    ht.id AS home_team_id, ht.name AS home_team_name, ht.short_name AS home_team_short, ht.logo_url AS home_team_logo,
    at.id AS away_team_id, at.name AS away_team_name, at.short_name AS away_team_short, at.logo_url AS away_team_logo,
    a.name AS arena_name, a.city AS arena_city, a.address AS arena_address
  FROM games g
  LEFT JOIN teams ht ON ht.id = g.home_team_id
  LEFT JOIN teams at ON at.id = g.away_team_id
  LEFT JOIN arenas a ON a.id = g.arena_id
`;

const mapGameRow = (r) => ({
  id: r.id,
  date: r.game_date,
  divisionId: r.division_id,
  stageType: r.stage_type,
  stageLabel: r.stage_label,
  playoffMatchType: r.playoff_match_type,
  gameNumber: r.game_number,
  seriesNumber: r.series_number,
  status: r.status,
  homeScore: r.home_score,
  awayScore: r.away_score,
  isTechnical: r.is_technical,
  endType: r.end_type,
  videoYtUrl: r.video_yt_url,
  videoVkUrl: r.video_vk_url,
  homeTeam: { id: r.home_team_id, name: r.home_team_name, shortName: r.home_team_short, logoUrl: r.home_team_logo },
  awayTeam: { id: r.away_team_id, name: r.away_team_name, shortName: r.away_team_short, logoUrl: r.away_team_logo },
  arenaName: r.arena_name,
  arenaCity: r.arena_city,
  arenaAddress: r.arena_address,
});

// node-postgres парсит колонки типа date/date[] в JS Date-объекты, а не в строки
// "YYYY-MM-DD" — при сериализации в JSON это превращается в полный ISO-таймстамп
// с временем ("2026-02-12T00:00:00.000Z"), который фронт (простой split('-')) не ждёт.
// Приводим явно к чистой дате по UTC-компонентам (in Postgres DATE не хранит время/зону).
const toIsoDateOnly = (v) => {
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    const d = String(v.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
};

// Прикидочные даты (game_date_estimates) живут в отдельной БД (tfhPool), а не в общей
// LMS/TR (sharedPool) — join одним SQL-запросом невозможен, подтягиваем и мёржим вручную.
// Имеет смысл только для игр без реальной даты (g.date === null).
const attachDateEstimates = async (games) => {
  const undatedIds = games.filter((g) => !g.date).map((g) => g.id);
  if (undatedIds.length === 0) return games;

  const { rows } = await tfhPool.query(
    `SELECT game_id, dates FROM game_date_estimates WHERE game_id = ANY($1::int[])`,
    [undatedIds]
  );
  const estimateByGameId = new Map(rows.map((r) => [r.game_id, r.dates.map(toIsoDateOnly)]));

  return games.map((g) => ({
    ...g,
    dateEstimate: g.date ? null : estimateByGameId.get(g.id) || null,
  }));
};

// Полный календарь сезона дивизиона. Черновики (status='draft') не показываем — это
// внутренняя подготовка расписания в LMS, публике её видеть рано.
export const getDivisionGames = async (req, res) => {
  const { id } = req.params;

  const divRows = await sharedPool.query(
    `SELECT id FROM divisions WHERE id = $1 AND is_published = true`,
    [id]
  );
  if (divRows.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

  // Сортируем по официальному номеру матча (games.game_number), а не по дате — у части
  // игр вместо реальной даты пока только прикидка или её вообще нет, дата для порядка
  // ненадёжна. game_date оставлен только как добивочный критерий для матчей без номера.
  const { rows } = await sharedPool.query(
    `${GAMES_SELECT}
     WHERE g.division_id = $1 AND g.status <> 'draft'
     ORDER BY g.game_number ASC NULLS LAST, g.game_date ASC NULLS LAST`,
    [id]
  );

  res.json({ games: await attachDateEstimates(rows.map(mapGameRow)) });
};

// Матчи текущей недели (пн–вс) — виджет-сайдбар на вкладке "Таблица".
export const getDivisionWeekGames = async (req, res) => {
  const { id } = req.params;

  const divRows = await sharedPool.query(
    `SELECT id FROM divisions WHERE id = $1 AND is_published = true`,
    [id]
  );
  if (divRows.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

  const { rows } = await sharedPool.query(
    `${GAMES_SELECT}
     WHERE g.division_id = $1 AND g.status <> 'draft'
       AND g.game_date >= date_trunc('week', CURRENT_DATE)
       AND g.game_date <  date_trunc('week', CURRENT_DATE) + interval '7 days'
     ORDER BY g.game_date ASC`,
    [id]
  );

  res.json({ games: rows.map(mapGameRow) });
};

// Матчи текущей недели по ВСЕМ опубликованным дивизионам/турнирам сразу — карусель
// на главной странице сайта (в отличие от getDivisionWeekGames, которая скопирована
// под один конкретный дивизион на его собственной странице).
export const getHomeWeekGames = async (req, res) => {
  const { rows } = await sharedPool.query(
    `${GAMES_SELECT}
     JOIN divisions d ON d.id = g.division_id
     WHERE d.is_published = true AND g.status NOT IN ('draft', 'cancelled')
       AND g.game_date >= date_trunc('week', CURRENT_DATE)
       AND g.game_date <  date_trunc('week', CURRENT_DATE) + interval '7 days'
     ORDER BY g.game_date ASC`
  );

  res.json({ games: rows.map(mapGameRow) });
};

// Сетка плей-офф. Читаем ту же структуру, что строит LMS-конструктор (divisionController.js
// getPlayoffBracket): playoff_brackets -> playoff_rounds -> playoff_matchups. Здесь только
// отображение — без ручного распределения/сброса, это делают в LMS.
export const getDivisionPlayoff = async (req, res) => {
  const { id } = req.params;

  const divRows = await sharedPool.query(
    `SELECT id FROM divisions WHERE id = $1 AND is_published = true`,
    [id]
  );
  if (divRows.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

  const visRows = await tfhPool.query(
    `SELECT is_visible FROM division_playoff_settings WHERE division_id = $1`,
    [id]
  );
  const isVisible = visRows.rows[0] ? visRows.rows[0].is_visible : true;

  // Скрытый блок отдаём пустым для всех, кроме админа (ему — с пометкой на фронте,
  // чтобы мог сам себе проверить и включить обратно).
  if (!isVisible && !isRequestFromAdmin(req)) {
    return res.json({ visible: false, brackets: [], games: [] });
  }

  const bracketsRes = await sharedPool.query(
    `SELECT id, name, is_main FROM playoff_brackets WHERE division_id = $1 ORDER BY is_main DESC, id ASC`,
    [id]
  );

  const brackets = [];
  for (const b of bracketsRes.rows) {
    const roundsRes = await sharedPool.query(
      `SELECT id, name, order_index, wins_needed FROM playoff_rounds WHERE bracket_id = $1 ORDER BY order_index ASC`,
      [b.id]
    );

    const matchupsRes = await sharedPool.query(
      `SELECT m.id, m.round_id, m.matchup_number, m.team1_id, m.team2_id,
              m.team1_wins, m.team2_wins, m.winner_id, m.ui_metadata,
              t1.name AS team1_name, t1.logo_url AS team1_logo,
              t2.name AS team2_name, t2.logo_url AS team2_logo
       FROM playoff_matchups m
       LEFT JOIN teams t1 ON m.team1_id = t1.id
       LEFT JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.round_id IN (SELECT id FROM playoff_rounds WHERE bracket_id = $1)
       ORDER BY m.matchup_number ASC`,
      [b.id]
    );

    const rounds = roundsRes.rows.map((r) => ({
      id: r.id,
      name: r.name,
      orderIndex: r.order_index,
      winsNeeded: r.wins_needed,
      matchups: matchupsRes.rows
        .filter((m) => m.round_id === r.id)
        .map((m) => ({
          id: m.id,
          matchupNumber: m.matchup_number,
          team1: m.team1_id ? { id: m.team1_id, name: m.team1_name, logoUrl: m.team1_logo } : null,
          team2: m.team2_id ? { id: m.team2_id, name: m.team2_name, logoUrl: m.team2_logo } : null,
          team1Wins: m.team1_wins,
          team2Wins: m.team2_wins,
          winnerId: m.winner_id,
          matchType: m.ui_metadata?.match_type || 'regular',
        })),
    }));

    brackets.push({ id: b.id, name: b.name, isMain: b.is_main, rounds });
  }

  const gamesRes = await sharedPool.query(
    `SELECT id, home_team_id, away_team_id, home_score, away_score, status, end_type, is_technical
     FROM games
     WHERE division_id = $1 AND stage_type = 'playoff' AND status <> 'cancelled'`,
    [id]
  );

  res.json({
    visible: isVisible,
    brackets,
    games: gamesRes.rows.map((g) => ({
      id: g.id,
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id,
      homeScore: g.home_score,
      awayScore: g.away_score,
      status: g.status,
      endType: g.end_type,
      isTechnical: g.is_technical,
    })),
  });
};

// Показать/скрыть блок "Стадия плей-офф" на публичной странице дивизиона — переключатель
// в режиме редактирования ТФХ. Хранится только в БД ТФХ (division_playoff_settings).
export const setDivisionPlayoffVisibility = async (req, res) => {
  const { id } = req.params;
  const { visible } = req.body;

  if (typeof visible !== 'boolean') {
    return res.status(400).json({ message: 'Передайте visible: true/false' });
  }

  await tfhPool.query(
    `INSERT INTO division_playoff_settings (division_id, is_visible, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (division_id) DO UPDATE SET is_visible = EXCLUDED.is_visible, updated_at = now()`,
    [id, visible]
  );

  res.json({ visible });
};

export const getDivisionTeams = async (req, res) => {
  const { id } = req.params;

  const divRows = await sharedPool.query(
    `SELECT id FROM divisions WHERE id = $1 AND is_published = true`,
    [id]
  );
  if (divRows.rows.length === 0) return res.status(404).json({ message: 'Не найдено' });

  const { rows } = await sharedPool.query(
    `SELECT tt.id AS tournament_team_id, t.id AS team_id, t.name, t.short_name, t.logo_url
     FROM tournament_teams tt
     JOIN teams t ON t.id = tt.team_id
     WHERE tt.division_id = $1 AND tt.status = 'approved'
     ORDER BY t.name`,
    [id]
  );

  res.json({
    teams: rows.map((r) => ({
      tournamentTeamId: r.tournament_team_id,
      teamId: r.team_id,
      name: r.name,
      shortName: r.short_name,
      logoUrl: r.logo_url,
    })),
  });
};

const formatPlayerName = (r) =>
  [r.last_name, r.first_name, r.middle_name].filter(Boolean).join(' ');

// Страница команды: карточка + состав, разбитый на вратарей/защитников/нападающих
// с уже готовой статистикой из player_statistics (её считает playerStatsCalculator.js в LMS
// при завершении матча или допуске команды — здесь просто читаем).
export const getTeamDetail = async (req, res) => {
  const { tournamentTeamId } = req.params;

  const { rows } = await sharedPool.query(
    `SELECT
       tt.id AS tournament_team_id, tt.custom_description, tt.custom_jersey_light_url, tt.custom_jersey_dark_url,
       t.id AS team_id, t.name, t.short_name, t.logo_url, t.description, t.jersey_light_url, t.jersey_dark_url,
       d.id AS division_id, d.name AS division_name
     FROM tournament_teams tt
     JOIN teams t ON t.id = tt.team_id
     JOIN divisions d ON d.id = tt.division_id
     WHERE tt.id = $1 AND tt.status = 'approved' AND d.is_published = true`,
    [tournamentTeamId]
  );

  const row = rows[0];
  if (!row) return res.status(404).json({ message: 'Не найдено' });

  const rosterRes = await sharedPool.query(
    `SELECT
       tr.id AS roster_id, tr.jersey_number, tr.position, tr.is_captain, tr.is_assistant,
       u.first_name, u.last_name, u.middle_name,
       ps.games_played, ps.goals, ps.assists, ps.points, ps.penalty_minutes,
       ps.goals_against, ps.save_percent
     FROM tournament_rosters tr
     JOIN users u ON u.id = tr.player_id
     LEFT JOIN player_statistics ps ON ps.tournament_roster_id = tr.id
     WHERE tr.tournament_team_id = $1 AND tr.application_status = 'approved' AND tr.period_end IS NULL
     ORDER BY tr.jersey_number NULLS LAST`,
    [tournamentTeamId]
  );

  const mapSkater = (r) => ({
    rosterId: r.roster_id,
    jerseyNumber: r.jersey_number,
    fullName: formatPlayerName(r),
    isCaptain: r.is_captain,
    isAssistant: r.is_assistant,
    gamesPlayed: Number(r.games_played || 0),
    goals: Number(r.goals || 0),
    assists: Number(r.assists || 0),
    points: Number(r.points || 0),
    penaltyMinutes: Number(r.penalty_minutes || 0),
  });
  const mapGoalie = (r) => ({
    rosterId: r.roster_id,
    jerseyNumber: r.jersey_number,
    fullName: formatPlayerName(r),
    isCaptain: r.is_captain,
    isAssistant: r.is_assistant,
    gamesPlayed: Number(r.games_played || 0),
    goalsAgainst: Number(r.goals_against || 0),
    savePercent: Number(r.save_percent || 0),
    penaltyMinutes: Number(r.penalty_minutes || 0),
  });

  res.json({
    team: {
      tournamentTeamId: row.tournament_team_id,
      teamId: row.team_id,
      name: row.name,
      shortName: row.short_name,
      logoUrl: row.logo_url,
      description: row.custom_description || row.description,
      jerseyLightUrl: row.custom_jersey_light_url || row.jersey_light_url,
      jerseyDarkUrl: row.custom_jersey_dark_url || row.jersey_dark_url,
      division: { id: row.division_id, name: row.division_name },
    },
    goalies: rosterRes.rows.filter((r) => r.position === 'goalie').map(mapGoalie),
    defensemen: rosterRes.rows.filter((r) => r.position === 'defense').map(mapSkater),
    forwards: rosterRes.rows.filter((r) => r.position === 'forward').map(mapSkater),
  });
};

// ==========================================
//   ПРИКИДОЧНАЯ ДАТА МАТЧА (режим редактирования ТФХ)
// ==========================================
// Пока в LMS/TR у матча не назначена реальная дата (games.game_date IS NULL), админ ТФХ
// может задать диапазон/набор дат для отображения на сайте. Хранится ТОЛЬКО в БД ТФХ
// (game_date_estimates) — общую БД LMS/TR не трогаем ни при каких условиях.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const setGameDateEstimate = async (req, res) => {
  const { gameId } = req.params;
  const { dates } = req.body;

  if (!Array.isArray(dates) || dates.length === 0 || !dates.every((d) => DATE_RE.test(d))) {
    return res.status(400).json({ message: 'Передайте непустой список дат в формате YYYY-MM-DD' });
  }

  const gameRows = await sharedPool.query(`SELECT id, game_date FROM games WHERE id = $1`, [gameId]);
  const game = gameRows.rows[0];
  if (!game) return res.status(404).json({ message: 'Матч не найден' });
  if (game.game_date) {
    return res.status(409).json({ message: 'У матча уже есть точная дата в LMS — прикидочная не нужна' });
  }

  const uniqueSortedDates = [...new Set(dates)].sort();

  await tfhPool.query(
    `INSERT INTO game_date_estimates (game_id, dates, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (game_id) DO UPDATE SET dates = EXCLUDED.dates, updated_at = now()`,
    [gameId, uniqueSortedDates]
  );

  res.json({ dateEstimate: uniqueSortedDates });
};

export const deleteGameDateEstimate = async (req, res) => {
  const { gameId } = req.params;
  await tfhPool.query(`DELETE FROM game_date_estimates WHERE game_id = $1`, [gameId]);
  res.status(204).send();
};
