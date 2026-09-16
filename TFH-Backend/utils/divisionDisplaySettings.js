import { tfhPool } from '../config/db.js';

// Настройки отображения страницы дивизиона на сайте — по одной строке на дивизион
// (division_display_settings в БД ТФХ, как division_playoff_settings). Правит админ
// прямо на той вкладке, где виден эффект, а не в отдельной админке.
//
// Строки у дивизиона может не быть: новый сезон — новые дивизионы, и пока админ ничего
// не сохранил, работают умолчания отсюда. По этой же причине умолчания живут здесь,
// а не только в DEFAULT колонок — SQL накатывают руками через Adminer, и между деплоем
// и накатом сайт должен работать, а не падать всей вкладкой «Таблица».
export const DISPLAY_SETTINGS_DEFAULTS = {
  // Блок «Ближайшие матчи» на вкладке «Таблица»: сколько матчей показывать всего
  // и сколько из них — уже сыгранных (остальные — предстоящие)
  matchesWidgetTotal: 6,
  matchesWidgetPast: 0,
  // Сетка вкладки «Команды»: карточек в ряду и размер логотипа в карточке, px
  teamsGridColumns: 5,
  teamsGridLogoSize: 140,
};

// Допустимые диапазоны — одни и те же для проверки на входе и для min/max бегунков
export const DISPLAY_SETTINGS_LIMITS = {
  matchesWidgetTotal: { min: 1, max: 30, label: 'Матчей всего' },
  matchesWidgetPast: { min: 0, max: 30, label: 'Из них прошедших' },
  teamsGridColumns: { min: 1, max: 10, label: 'Команд в ряду' },
  teamsGridLogoSize: { min: 40, max: 300, label: 'Размер логотипа' },
};

export const toDisplaySettingsDto = (row) => ({
  matchesWidgetTotal: row.matches_widget_total,
  matchesWidgetPast: row.matches_widget_past,
  teamsGridColumns: row.teams_grid_columns,
  teamsGridLogoSize: row.teams_grid_logo_size,
});

let warnedMissingTable = false;

export const loadDivisionDisplaySettings = async (divisionId) => {
  try {
    const { rows } = await tfhPool.query(
      'SELECT * FROM division_display_settings WHERE division_id = $1',
      [divisionId]
    );
    return rows.length ? toDisplaySettingsDto(rows[0]) : { ...DISPLAY_SETTINGS_DEFAULTS };
  } catch (err) {
    // 42P01 = таблицы нет. Живём на умолчаниях, но говорим об этом в лог — один раз,
    // а не на каждый запрос, иначе страница дивизиона зальёт лог одной и той же строкой.
    if (err.code !== '42P01') throw err;
    if (!warnedMissingTable) {
      warnedMissingTable = true;
      console.error('🚨 PostgreSQL (TFH): таблицы division_display_settings нет — настройки страниц дивизионов работают на умолчаниях, сохранить их нельзя. Нужно накатить SQL.');
    }
    return { ...DISPLAY_SETTINGS_DEFAULTS };
  }
};
