import { sharedPool } from '../config/db.js';

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
