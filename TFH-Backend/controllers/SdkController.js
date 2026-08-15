import { sharedPool, tfhPool } from '../config/db.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const LEAGUE_ID = Number(process.env.LEAGUE_ID);

/**
 * Таблица штрафов СДК — картинки, которые админ сайта прикладывает к сезону.
 *
 * Сезоны живут в общей базе лиги, картинки — в базе сайта, поэтому season_id
 * здесь обычное число без внешнего ключа: связать таблицы из разных баз нечем.
 */

const toDto = (row) => ({
  id: row.id,
  seasonId: row.season_id,
  url: publicS3Url(row.image_filename),
});

const extFromMime = (mimetype) => {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
};

export const getPenaltyImages = async (req, res) => {
  const seasonId = Number(req.query.seasonId);
  if (!seasonId) return res.status(400).json({ message: 'Не указан сезон' });

  const { rows } = await tfhPool.query(
    'SELECT * FROM sdk_penalty_images WHERE season_id = $1 ORDER BY id',
    [seasonId]
  );
  res.json({ images: rows.map(toDto) });
};

// Загрузка пачкой: страницы таблицы обычно добавляют разом, по одной было бы мучением
export const addPenaltyImages = async (req, res) => {
  const seasonId = Number(req.body.seasonId);
  const files = req.files || [];

  if (!seasonId) return res.status(400).json({ message: 'Не указан сезон' });
  if (files.length === 0) return res.status(400).json({ message: 'Прикрепите изображение' });

  for (const file of files) {
    const key = await uploadBuffer(file.buffer, 'sdk/penalty-table', {
      contentType: file.mimetype,
      extension: extFromMime(file.mimetype),
    });
    await tfhPool.query(
      'INSERT INTO sdk_penalty_images (season_id, image_filename) VALUES ($1, $2)',
      [seasonId, key]
    );
  }

  // Отдаём сезон целиком, а не только добавленное: клиенту не нужно доклеивать
  // список руками и гадать о порядке
  const { rows } = await tfhPool.query(
    'SELECT * FROM sdk_penalty_images WHERE season_id = $1 ORDER BY id',
    [seasonId]
  );
  res.status(201).json({ images: rows.map(toDto) });
};

export const deletePenaltyImage = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query(
    'DELETE FROM sdk_penalty_images WHERE id = $1 RETURNING *',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Изображение не найдено' });

  await deleteObject(rows[0].image_filename);
  res.status(204).send();
};

// ==========================================
// ПРОТОКОЛЫ СДК
// ==========================================

/**
 * Протоколы читаются из общей базы лиги: заседания ведутся в LMS, сайт их только
 * показывает. Ничего не пишем и не дублируем у себя — иначе пришлось бы держать
 * копию в актуальном состоянии.
 *
 * Берём только заседания самого СДК (meeting_type = 'sdk'): КПДУ, АК и ЭК — другие
 * комиссии, и на витрину федерации они не идут.
 */

export const getMeetings = async (req, res) => {
  const seasonId = Number(req.query.seasonId);
  if (!seasonId) return res.status(400).json({ message: 'Не указан сезон' });

  const { rows } = await sharedPool.query(
    // По номеру, а не по дате: номер и стоит в названии протокола, и сетка на сайте
    // должна читаться как непрерывный ряд. Дата остаётся вторым ключом — на случай
    // заседаний без номера
    `SELECT id, sequence_number, held_at, status
     FROM sdk_meetings
     WHERE league_id = $1 AND season_id = $2 AND meeting_type = 'sdk'
     ORDER BY sequence_number DESC NULLS LAST, held_at DESC`,
    [LEAGUE_ID, seasonId]
  );

  res.json({
    meetings: rows.map((r) => ({
      id: r.id,
      number: r.sequence_number,
      heldAt: r.held_at,
      status: r.status,
    })),
  });
};

// Основание рассмотрения человекочитаемо: у рапорта и протеста уточнение лежит
// в отдельных полях, у «иного» — свободным текстом. Та же логика, что в LMS.
const basisText = (row) => {
  if (row.hearing_basis_type === 'referee_report') {
    return `Рапорт главного судьи${row.hearing_basis_referee_name ? ` — ${row.hearing_basis_referee_name}` : ''}`;
  }
  if (row.hearing_basis_type === 'team_protest') {
    return `Протест команды${row.hearing_basis_team_name ? ` — ${row.hearing_basis_team_name}` : ''}`;
  }
  return row.hearing_basis || null;
};

const fullName = (last, first, middle) => [last, first, middle].filter(Boolean).join(' ') || null;

export const getMeeting = async (req, res) => {
  const { id } = req.params;

  const meetingRes = await sharedPool.query(
    `SELECT m.id, m.sequence_number, m.held_at, m.period_start, m.period_end, m.status,
            COALESCE(m.venue_name_snapshot, v.name) AS venue_name
     FROM sdk_meetings m
     LEFT JOIN sdk_venues v ON v.id = m.venue_id
     WHERE m.id = $1 AND m.league_id = $2 AND m.meeting_type = 'sdk'`,
    [id, LEAGUE_ID]
  );

  const meeting = meetingRes.rows[0];
  if (!meeting) return res.status(404).json({ message: 'Протокол не найден' });

  const membersRes = await sharedPool.query(
    `SELECT COALESCE(mm.full_name_snapshot, cm.full_name) AS full_name,
            COALESCE(mm.role_snapshot, cm.position) AS position
     FROM sdk_meeting_members mm
     LEFT JOIN sdk_commission_members cm ON cm.id = mm.commission_member_id
     WHERE mm.meeting_id = $1
     ORDER BY mm.member_kind ASC, full_name ASC`,
    [id]
  );

  // Снимки нарушения и ФИО берём из решения, а не из справочников: справочник
  // потом правят, а протокол должен остаться таким, каким его вынесли
  const decisionsRes = await sharedPool.query(
    `SELECT dec.id, dec.target_type, dec.other_person_name, dec.verdict_description,
            dec.penalty_games, dec.mandatory_games, dec.additional_games,
            dec.penalty_amount, dec.team_penalty_mode,
            dec.hearing_basis, dec.hearing_basis_type,
            COALESCE(dec.violation_code_snapshot, vt.code) AS violation_code,
            COALESCE(dec.violation_title_snapshot, vt.title) AS violation_title,
            concat_ws(' ', ru.last_name, ru.first_name, ru.middle_name) AS hearing_basis_referee_name,
            pt.name AS hearing_basis_team_name,
            t.name AS team_name,
            tr.jersey_number,
            ttr.tournament_role AS staff_role,
            COALESCE(u.last_name, u2.last_name)     AS last_name,
            COALESCE(u.first_name, u2.first_name)   AS first_name,
            COALESCE(u.middle_name, u2.middle_name) AS middle_name,
            g.game_number, g.game_date
     FROM sdk_meeting_decisions dec
     LEFT JOIN sdk_violation_types vt ON vt.id = dec.violation_type_id
     LEFT JOIN tournament_teams tt ON tt.id = dec.tournament_team_id
     LEFT JOIN teams t ON t.id = tt.team_id
     LEFT JOIN tournament_rosters tr ON tr.id = dec.tournament_roster_id
     LEFT JOIN users u ON u.id = tr.player_id
     LEFT JOIN tournament_team_roles ttr ON ttr.id = dec.tournament_team_role_id
     LEFT JOIN users u2 ON u2.id = ttr.user_id
     LEFT JOIN games g ON g.id = dec.game_id
     LEFT JOIN users ru ON ru.id = dec.hearing_basis_user_id
     LEFT JOIN tournament_teams ptt ON ptt.id = dec.hearing_basis_team_id
     LEFT JOIN teams pt ON pt.id = ptt.team_id
     WHERE dec.meeting_id = $1
     ORDER BY dec.created_at ASC`,
    [id]
  );

  res.json({
    meeting: {
      id: meeting.id,
      number: meeting.sequence_number,
      heldAt: meeting.held_at,
      periodStart: meeting.period_start,
      periodEnd: meeting.period_end,
      status: meeting.status,
      venueName: meeting.venue_name,
      members: membersRes.rows.map((m) => ({ fullName: m.full_name, position: m.position })),
      decisions: decisionsRes.rows.map((d) => ({
        id: d.id,
        targetType: d.target_type,
        personName: d.other_person_name || fullName(d.last_name, d.first_name, d.middle_name),
        jerseyNumber: d.jersey_number,
        staffRole: d.staff_role,
        teamName: d.team_name,
        violationCode: d.violation_code,
        violationTitle: d.violation_title,
        verdictDescription: d.verdict_description,
        penaltyGames: d.penalty_games,
        mandatoryGames: d.mandatory_games,
        additionalGames: d.additional_games,
        // Копейки в решениях не используются — на витрине показываем целые рубли
        penaltyAmount: d.penalty_amount == null ? null : Math.round(Number(d.penalty_amount)),
        teamPenaltyMode: d.team_penalty_mode,
        basis: basisText(d),
        gameNumber: d.game_number,
        gameDate: d.game_date,
      })),
    },
  });
};
