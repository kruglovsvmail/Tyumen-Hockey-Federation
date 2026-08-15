const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

// '2026-02-20T11:00:00' -> '20.02.2026'
export const formatProtocolDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
};

// '2026-02-20T11:00:00' -> '20 февраля 2026 года'
const formatHeldAt = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} года`;
};

// '2026-01-27' -> '27 января'. Год опускаем: он есть в конце диапазона
const formatPeriodPart = (value, withYear) => {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y} года` : ''}`;
};

// Нарушителя приходится склонять: в перечне вопросов он в творительном падеже
// («нарушение допущено кем»), а в постановлении — в винительном («наказать кого»).
// Держим обе формы явным списком: автоматического склонения в проекте нет,
// а ролей всего четыре.
const STAFF_ROLE_FORMS = {
  team_manager: { instrumental: 'руководителем команды', accusative: 'руководителя команды' },
  coach:        { instrumental: 'тренером команды',      accusative: 'тренера команды' },
  team_admin:   { instrumental: 'администратором команды', accusative: 'администратора команды' },
  head_coach:   { instrumental: 'тренером команды',      accusative: 'тренера команды' },
};

// Склонение «матч» по числу: 1 матч, 2–4 матча, 5+ матчей
const pluralizeMatches = (n) => {
  const mod10 = Math.abs(n) % 10;
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'матчей';
  if (mod10 === 1) return 'матч';
  if (mod10 >= 2 && mod10 <= 4) return 'матча';
  return 'матчей';
};

/**
 * Нарушитель строкой в нужном падеже.
 *
 * Игрока опознают по номеру на свитере, представителя команды — по роли. У роли
 * название уже заканчивается на «команды», поэтому название клуба к ней цепляется
 * сразу («администратора команды «Русойл»»), иначе «команды» шло бы дважды.
 */
const targetText = (d, form) => {
  if (d.targetType === 'other') return d.personName || (form === 'accusative' ? 'иное лицо' : 'иным лицом');

  const name = d.personName ? ` (${d.personName})` : '';

  if (d.staffRole) {
    const role = STAFF_ROLE_FORMS[d.staffRole]?.[form] || d.staffRole;
    return `${role}${d.teamName ? ` «${d.teamName}»` : ''}${name}`;
  }

  const who = form === 'accusative' ? 'игрока' : 'игроком';
  const number = d.jerseyNumber != null ? ` №${d.jerseyNumber}` : '';
  const team = d.teamName ? ` команды «${d.teamName}»` : '';
  return `${who}${number}${name}${team}`;
};

// Санкция строкой: матчи и деньги, как их вынесли
const penaltyText = (d) => {
  const parts = [];

  const games = d.penaltyGames ?? ((d.mandatoryGames || 0) + (d.additionalGames || 0) || null);
  if (games) parts.push(`${games} ${pluralizeMatches(games)}`);

  if (d.penaltyAmount) {
    const amount = `${d.penaltyAmount.toLocaleString('ru-RU')} руб.`;
    parts.push(d.teamPenaltyMode === 'split' ? `${amount} (сумма делится)` : amount);
  }

  return parts.join(', ');
};

/**
 * Протокол заседания СДК в том виде, в каком его публикуют федерации: шапка с
 * реквизитами, состав комиссии, основания, перечень вопросов и постановления.
 *
 * Из данных LMS это собирается так: «вопрос» — само нарушение (пункт таблицы
 * штрафов и нарушитель), «постановление» — вынесенный вердикт и санкция.
 * Отдельных текстов под вопрос и постановление в модели нет.
 *
 * onBack — возврат к сетке протоколов. Кнопка живёт внутри самого блока, а не над
 * ним: протокол открывается на месте списка, и выход из него — часть этого блока.
 */
export default function SdkProtocol({ meeting, onBack }) {
  const { decisions = [], members = [] } = meeting;

  // Основания у решений часто повторяются (один рапорт на несколько нарушений) —
  // в шапке протокола показываем каждое по одному разу
  const bases = [];
  decisions.forEach((d) => {
    const game = d.gameNumber
      ? `Официальный протокол матча №${d.gameNumber}${d.gameDate ? ` от ${formatProtocolDate(d.gameDate)} г.` : ''}`
      : null;
    [d.basis, game].filter(Boolean).forEach((text) => {
      if (!bases.includes(text)) bases.push(text);
    });
  });

  const sameYear =
    meeting.periodStart && meeting.periodEnd
      && String(meeting.periodStart).slice(0, 4) === String(meeting.periodEnd).slice(0, 4);

  return (
    <article className="sdk-protocol content-in">
      {/* Кнопка возврата — у самого края плашки, вне полей текста протокола */}
      {onBack && (
        <button type="button" className="sdk-protocol__back" onClick={onBack}>
          ‹ Все протоколы
        </button>
      )}

      {/* Поля текста задаёт обёртка, а не сама плашка: кнопка возврата должна
          остаться у её края */}
      <div className="sdk-protocol__body">
        <h3 className="sdk-protocol__title">
          Протокол СДК №{meeting.number ?? '—'} от {formatProtocolDate(meeting.heldAt)}
        </h3>

        <div className="sdk-protocol__meta">
          <div>Дата проведения: {formatHeldAt(meeting.heldAt)}</div>
          {meeting.venueName && <div>Место проведения: {meeting.venueName}</div>}
          {meeting.periodStart && meeting.periodEnd && (
            <div>
              За период: {formatPeriodPart(meeting.periodStart, !sameYear)} -{' '}
              {formatPeriodPart(meeting.periodEnd, true)}
            </div>
          )}
        </div>

        {members.length > 0 && (
          <section className="sdk-protocol__block">
            <h4 className="sdk-protocol__subtitle">Присутствовали:</h4>
            <div className="sdk-protocol__list">
              {members.map((m, i) => (
                <div key={i}>{m.position ? `${m.position}: ` : ''}{m.fullName}</div>
              ))}
            </div>
          </section>
        )}

        {/* Блок стоит всегда: на заседании без решений оснований и не бывает, но
            пропущенная строка читалась бы как недосмотр вёрстки, а не как факт */}
        <section className="sdk-protocol__block">
          <h4 className="sdk-protocol__subtitle">Основания для рассмотрения:</h4>
          <div className="sdk-protocol__list">
            {bases.length > 0 ? bases.map((text, i) => <div key={i}>{text}.</div>) : 'нет'}
          </div>
        </section>

        {decisions.length > 0 ? (
          <>
            <section className="sdk-protocol__block">
              <h4 className="sdk-protocol__subtitle">Рассмотрены вопросы:</h4>
              <ol className="sdk-protocol__items">
                {decisions.map((d) => (
                  <li key={d.id}>
                    {d.violationCode ? (
                      <>Нарушение <b>п.{d.violationCode}.</b> {d.violationTitle} {targetText(d, 'instrumental')}.</>
                    ) : (
                      <>{d.violationTitle || 'Вопрос к рассмотрению'} {targetText(d, 'instrumental')}.</>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <section className="sdk-protocol__block">
              <h4 className="sdk-protocol__subtitle">
                Арбитры СДК, ознакомившись с представленными материалами, постановили:
              </h4>
              <ol className="sdk-protocol__items">
                {decisions.map((d) => {
                  const penalty = penaltyText(d);
                  return (
                    <li key={d.id}>
                      {d.verdictDescription
                        ? <span className="sdk-protocol__verdict">{d.verdictDescription}</span>
                        : (
                          <>
                            Наказать {targetText(d, 'accusative')}
                            {d.violationCode ? <> по <b>п.{d.violationCode}.</b></> : null}
                            {d.violationTitle ? ` (${d.violationTitle})` : ''}
                          </>
                        )}
                      {penalty && <> <b>{penalty}</b></>}
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        ) : (
          <section className="sdk-protocol__block">
            <h4 className="sdk-protocol__subtitle">Рассмотрены вопросы:</h4>
            <div className="sdk-protocol__list">Вопросов к рассмотрению не поступало.</div>
          </section>
        )}
      </div>
    </article>
  );
}
