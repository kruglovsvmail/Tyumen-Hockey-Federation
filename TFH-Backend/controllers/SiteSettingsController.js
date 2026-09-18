import { tfhPool } from '../config/db.js';
import { loadSiteSettings, toSiteSettingsDto, SITE_SETTINGS_LIMITS } from '../utils/siteSettings.js';

// Настройки сайта без «своего» дивизиона — singleton (одна строка), как contacts_info.
// Что именно хранится и умолчания — см. utils/siteSettings.js.

export const getSiteSettings = async (req, res) => {
  res.json({ settings: await loadSiteSettings() });
};

// Обновление частичное: форма присылает только свои поля, остальные остаются как были —
// когда настроек станет больше одной, формам не придётся знать друг о друге.
export const updateSiteSettings = async (req, res) => {
  const next = await loadSiteSettings();

  for (const [key, { min, max, label }] of Object.entries(SITE_SETTINGS_LIMITS)) {
    if (req.body[key] === undefined) continue;
    const value = Number(req.body[key]);
    if (!Number.isInteger(value) || value < min || value > max) {
      return res.status(400).json({ message: `${label}: нужно целое число от ${min} до ${max}` });
    }
    next[key] = value;
  }

  if (next.homeMatchesPast > next.homeMatchesTotal) {
    return res.status(400).json({ message: 'Прошедших матчей не может быть больше, чем матчей всего' });
  }

  const values = [next.homeMatchesTotal, next.homeMatchesPast];

  const { rows: existingRows } = await tfhPool.query('SELECT id FROM site_settings ORDER BY id LIMIT 1');

  const { rows } = existingRows.length
    ? await tfhPool.query(
        `UPDATE site_settings
         SET home_matches_total = $1, home_matches_past = $2, updated_at = now()
         WHERE id = $3
         RETURNING *`,
        [...values, existingRows[0].id]
      )
    : await tfhPool.query(
        `INSERT INTO site_settings (home_matches_total, home_matches_past)
         VALUES ($1, $2)
         RETURNING *`,
        values
      );

  res.json({ settings: toSiteSettingsDto(rows[0]) });
};
