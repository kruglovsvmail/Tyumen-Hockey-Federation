import { tfhPool } from '../config/db.js';

// Настройки сайта, у которых нет «своего» дивизиона — singleton, одна строка на весь
// сайт (site_settings в БД ТФХ, как contacts_info). Сейчас это карусель ближайших
// матчей на главной: она собирает матчи всех дивизионов и турниров лиги, и настройка
// у неё общая. Настройки страницы дивизиона живут отдельно — utils/divisionDisplaySettings.js.
//
// Умолчания продублированы здесь, а не только в DEFAULT колонок: SQL накатывают руками
// через Adminer, и между деплоем и накатом главная должна работать, а не падать.
export const SITE_SETTINGS_DEFAULTS = {
  // Карусель на главной: сколько матчей показывать всего и сколько из них — уже
  // сыгранных (остальные — предстоящие). В ряд помещается четыре карточки, поэтому
  // умолчание — две «страницы».
  homeMatchesTotal: 8,
  homeMatchesPast: 0,
};

// Допустимые диапазоны — одни и те же для проверки на входе и для min/max бегунков
export const SITE_SETTINGS_LIMITS = {
  homeMatchesTotal: { min: 1, max: 30, label: 'Матчей всего' },
  homeMatchesPast: { min: 0, max: 30, label: 'Из них прошедших' },
};

export const toSiteSettingsDto = (row) => ({
  homeMatchesTotal: row.home_matches_total,
  homeMatchesPast: row.home_matches_past,
});

let warnedMissingTable = false;

export const loadSiteSettings = async () => {
  try {
    const { rows } = await tfhPool.query('SELECT * FROM site_settings ORDER BY id LIMIT 1');
    return rows.length ? toSiteSettingsDto(rows[0]) : { ...SITE_SETTINGS_DEFAULTS };
  } catch (err) {
    // 42P01 = таблицы нет. Живём на умолчаниях, но говорим об этом в лог — один раз,
    // а не на каждый запрос, иначе главная зальёт лог одной и той же строкой.
    if (err.code !== '42P01') throw err;
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.error('🚨 PostgreSQL (TFH): таблицы site_settings нет — настройки главной работают на умолчаниях, сохранить их нельзя. Нужно накатить SQL.');
    }
    return { ...SITE_SETTINGS_DEFAULTS };
  }
};
