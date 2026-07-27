// Тот же принцип, что в LMS (LMS-Frontend/src/utils/helpers.js): раунд плей-офф
// (games.stage_label, например "Финал") физически может содержать несколько разных пар —
// за 1-е место и, например, за 3-е. games.playoff_match_type это различает: null — обычная/
// главная пара (используем stage_label как есть), "place_3"/"place_5"/... — подменяем текст
// на "Матч за N-е место", иначе матч за 3-е место выглядел бы как ещё один "Финал".
export function getPlayoffStageDisplayLabel(stageLabel, playoffMatchType) {
  if (!playoffMatchType) return stageLabel;
  const n = playoffMatchType.replace('place_', '');
  return `Матч за ${n}-е место`;
}

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

export function formatGameDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function formatGameTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' -> Date в локальном времени. new Date('YYYY-MM-DD') парсит как UTC-полночь,
// что в плюсовых часовых поясах (вся Россия) может съехать на день назад при выводе через
// getDate() — поэтому собираем дату вручную из компонентов.
const parseDateOnly = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const isNextCalendarDay = (a, b) => {
  const next = new Date(a);
  next.setDate(next.getDate() + 1);
  return next.toDateString() === b.toDateString();
};

// Массив дат ['2026-02-12', '2026-02-13', ...] -> человекочитаемая строка. Идущие подряд
// даты схлопываются в диапазон ("12–15 фев"), остальные перечисляются через запятую
// ("12, 17 фев") — деления на "диапазон"/"список" в данных нет, это просто вопрос вывода.
export function formatDateEstimate(dates) {
  if (!dates || dates.length === 0) return '';
  const parsed = [...dates].sort().map(parseDateOnly);

  const runs = [];
  let runStart = parsed[0];
  let runEnd = parsed[0];
  for (let i = 1; i < parsed.length; i++) {
    if (isNextCalendarDay(runEnd, parsed[i])) {
      runEnd = parsed[i];
    } else {
      runs.push([runStart, runEnd]);
      runStart = parsed[i];
      runEnd = parsed[i];
    }
  }
  runs.push([runStart, runEnd]);

  const formatRun = ([start, end]) => {
    if (start.getTime() === end.getTime()) {
      return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
    }
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
    }
    return `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
  };

  return runs.map(formatRun).join(', ');
}
