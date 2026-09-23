import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import { getImageUrl } from '../utils/getImageUrl.js';
import './TeamApplicationPrintPage.css';

// Печатная заявка команды на сезон: лист A4 с фотографиями, который печатают из браузера.
// Открывается в новой вкладке ссылкой «Распечатать заявку» со страницы команды и живёт
// вне Layout — на листе не должно быть ни шапки сайта, ни фона, ни подвала.
// Данные те же, что у страницы команды (/api/championship/teams/:id), отдельного
// эндпоинта нет: заявка — это тот же состав, только в другой раскладке.

const COLUMNS = 5;

// Роли представителей (tournament_team_roles.tournament_role). Те же должности, что на
// странице команды и в LMS, без пометки «подписант» — на листе она ни к чему.
const STAFF_ROLE_LABELS = {
  team_manager: 'Руководитель команды',
  team_admin: 'Администратор команды',
  coach: 'Тренер команды',
};

// Позиция на карточке — буквой, как в бумажных заявках: обводится своя из трёх.
const POSITION_LETTERS = [
  { key: 'goalie', letter: 'В' },
  { key: 'defense', letter: 'З' },
  { key: 'forward', letter: 'Н' },
];

// Номер по возрастанию, игроки без номера — в конце; при одинаковых номерах
// (такое бывает, см. два 55-х в образце) — по фамилии, чтобы порядок не прыгал.
const byNumberThenName = (a, b) =>
  (a.jerseyNumber ?? Infinity) - (b.jerseyNumber ?? Infinity)
  || (a.fullName || '').localeCompare(b.fullName || '', 'ru');

// '1992-04-02' -> '02.04.92'. Короткий год — как в образце: в узкой карточке рядом с
// квалификацией полный не помещается. Строку переставляем сами, без Date — иначе дата
// могла бы съехать на день из-за часового пояса.
const formatShortDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y.slice(2)}`;
};

// Время печати в шапке — как на бумажном бланке: «23.09.26 10:23».
const formatPrintedAt = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${String(date.getFullYear()).slice(2)} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Раскладка по строкам из пяти. Строки, а не одна общая сетка — чтобы при переносе
// на следующий лист карточки не резались пополам: строке запрещён разрыв внутри.
const chunk = (items, size) => {
  const rows = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
};

// Битая ссылка на бумаге печаталась бы значком сломанной картинки — вместо него заглушка
function Photo({ url }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <img src={getImageUrl(url)} alt="" className="app-print__photo" onError={() => setFailed(true)} />
  ) : (
    <div className="app-print__photo app-print__photo--stub" aria-hidden="true">
      <svg viewBox="0 0 60 80">
        <circle cx="30" cy="28" r="13" />
        <path d="M6 80c0-16 10.7-26 24-26s24 10 24 26z" />
      </svg>
    </div>
  );
}

// Логотип, который не загрузился, просто не печатается
function Logo({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt="" className="app-print__logo" onError={() => setFailed(true)} />;
}

function PersonName({ person }) {
  return (
    <>
      <b className="app-print__surname">{person.lastName}</b>
      <b className="app-print__first-name">{person.firstName}</b>
      {person.middleName && <span className="app-print__middle-name">{person.middleName}</span>}
    </>
  );
}

function PlayerCard({ player }) {
  return (
    <div className="app-print__cell app-print__player">
      <div className="app-print__side">
        <span className="app-print__number">{player.jerseyNumber ?? ''}</span>
        <span className="app-print__captain">
          {player.isCaptain ? 'К' : player.isAssistant ? 'А' : ''}
        </span>
        <span className="app-print__positions">
          {POSITION_LETTERS.map(({ key, letter }) => (
            <span
              key={key}
              className={`app-print__position${player.position === key ? ' app-print__position--own' : ''}`}
            >
              {letter}
            </span>
          ))}
        </span>
      </div>
      <div className="app-print__main">
        <Photo url={player.photoUrl} />
        <PersonName person={player} />
        <span className="app-print__birth">
          {formatShortDate(player.birthDate)}
          {player.qualification && <> [<b>{player.qualification.short}</b>]</>}
        </span>
      </div>
    </div>
  );
}

function StaffCard({ person }) {
  return (
    <div className="app-print__cell app-print__staff">
      <div className="app-print__roles">
        {person.roles.map((role) => (
          <span key={role}>{STAFF_ROLE_LABELS[role] || role}</span>
        ))}
      </div>
      <Photo url={person.photoUrl} />
      <PersonName person={person} />
    </div>
  );
}

function CardRows({ items, renderCard }) {
  return chunk(items, COLUMNS).map((row, i) => (
    <div key={i} className="app-print__row">
      {row.map(renderCard)}
    </div>
  ));
}

export default function TeamApplicationPrintPage() {
  const { teamId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [printedAt] = useState(() => new Date());

  useEffect(() => {
    apiGet(`/api/championship/teams/${teamId}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [teamId]);

  // Заголовок вкладки становится именем файла, если заявку сохранить в PDF
  useEffect(() => {
    if (data?.team) document.title = `Заявка — ${data.team.name}`;
  }, [data]);

  if (error) return <p className="app-print__status">Не удалось загрузить заявку: {error}</p>;
  if (!data) return <p className="app-print__status">Загрузка заявки…</p>;

  const { team, staff } = data;

  // В заявке все допущенные, в том числе дисквалифицированные: из заявки они не выбывают,
  // просто пропускают матчи. Недопущенных (снят тумблер в LMS) на листе нет.
  const players = [...data.goalies, ...data.defensemen, ...data.forwards, ...(data.disqualified || [])];
  const goalies = players.filter((p) => p.position === 'goalie').sort(byNumberThenName);
  const skaters = players.filter((p) => p.position !== 'goalie').sort(byNumberThenName);

  const title = [team.division.leagueName, team.division.seasonName].filter(Boolean).join(' • ');

  return (
    <div className="app-print">
      <div className="app-print__toolbar">
        <button type="button" className="app-print__print-btn" onClick={() => window.print()}>
          Распечатать
        </button>
        <span className="app-print__hint">
          Чтобы получить файл, в окне печати выберите «Сохранить как PDF».
        </span>
      </div>

      <div className="app-print__sheet">
        <header className="app-print__header">
          <div className="app-print__header-side">
            <span className="app-print__printed-at">{formatPrintedAt(printedAt)}</span>
            <Logo src={getImageUrl(team.logoUrl)} />
          </div>
          <div className="app-print__header-text">
            {title && <div className="app-print__league">{title}</div>}
            <div className="app-print__division">{team.division.name}</div>
            <div className="app-print__team">Команда «{team.name}»</div>
            {team.city && <div className="app-print__city">{team.city}</div>}
          </div>
          <div className="app-print__header-side app-print__header-side--right">
            {/* Логотип лиги из LMS, а если его там нет — эмблема федерации с шапки сайта */}
            <Logo src={getImageUrl(team.division.leagueLogoUrl) || '/image/logo.webp'} />
          </div>
        </header>

        {/* Сначала вратари, за ними сразу полевые одним списком по номерам, в конце
            представители — с новой строки, как в бумажной заявке. */}
        <div className="app-print__grid">
          <CardRows
            items={[...goalies, ...skaters]}
            renderCard={(p) => <PlayerCard key={p.rosterId} player={p} />}
          />
          <CardRows items={staff} renderCard={(s) => <StaffCard key={s.userId} person={s} />} />
        </div>

        {/* Экранная копия подписи. На бумагу её ставит поле страницы в CSS — на каждый лист */}
        <div className="app-print__brand">Хоккейная экосистема HockeyEco</div>
      </div>
    </div>
  );
}
