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

// Матч без точного начала, но с датой в расписании LMS (черновик: организатор вписал
// день, а арену или время ещё нет). Дата 'YYYY-MM-DD' и время 'HH:MM' — уже по часам
// арены, пояс не пересчитываем. '2026-10-18', null -> '18 окт · время уточняется'.
export function formatDraftSchedule(draftDate, draftTime) {
  if (!draftDate) return '';
  const d = parseDateOnly(draftDate);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${draftTime || 'время уточняется'}`;
}

// Время из черновика LMS без даты: организатор знает час, но не день. Дописываем его
// к «Дата не назначена» (к прикидке его дописывает formatDateEstimate).
// 'Дата не назначена', '19:30' -> 'Дата не назначена · 19:30'.
export function withDraftTime(dateText, draftTime) {
  return draftTime ? `${dateText} · ${draftTime}` : dateText;
}

// '1990-05-20' -> '20.05.1990'. Дата рождения приходит без времени, поэтому просто
// переставляем компоненты строки — через Date она могла бы съехать на день из-за часового пояса.
export function formatBirthDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

// 21 -> '21 год', 24 -> '24 года', 25 -> '25 лет'. Обычное русское склонение:
// особый случай — вторые десятки (11–14), там всегда "лет".
export function formatAge(years) {
  if (years === null || years === undefined) return '';
  const mod10 = years % 10;
  const mod100 = years % 100;
  let word = 'лет';
  if (mod10 === 1 && mod100 !== 11) word = 'год';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'года';
  return `${years} ${word}`;
}

// Прикидка [{ date: 'YYYY-MM-DD', time: 'HH:MM' | null }, ...] -> строка. Дни идут через
// черту, месяц пишется после последнего дня своего месяца, время дня — в скобках:
// '19 | 20 (21:30) | 21 окт', '30 | 31 окт | 1 ноя'. Подряд идущие дни в диапазон не
// склеиваются: лига выбирает конкретные дни, «19–21» читалось бы как «весь период».
// draftTime — время из черновика LMS: оно главнее времени прикидки (скорее всего это уже
// точное время, неизвестен только день), тогда у дней время не пишем, а ставим его в конце:
// '19 | 20 | 21 окт · 21:30'. Старый вид — просто массив строк дат — тоже понимаем.
export function formatDateEstimate(estimate, draftTime = null) {
  if (!estimate || estimate.length === 0) return '';
  const entries = estimate
    .map((e) => (typeof e === 'string' ? { date: e, time: null } : e))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const parts = entries.map((e, i) => {
    const d = parseDateOnly(e.date);
    const next = entries[i + 1] ? parseDateOnly(entries[i + 1].date) : null;
    const isLastOfMonth = !next || next.getMonth() !== d.getMonth() || next.getFullYear() !== d.getFullYear();
    const month = isLastOfMonth ? ` ${MONTHS_SHORT[d.getMonth()]}` : '';
    const time = !draftTime && e.time ? ` (${e.time})` : '';
    return `${d.getDate()}${month}${time}`;
  });

  const text = parts.join(' | ');
  return draftTime ? `${text} · ${draftTime}` : text;
}
