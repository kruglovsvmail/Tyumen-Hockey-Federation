import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import PhotoLightbox from '../components/PhotoLightbox.jsx';
import Loader from '../components/Loader.jsx';
import { getImageUrl } from '../utils/getImageUrl.js';
import { formatAge, formatBirthDate } from '../utils/formatDate.js';
import '../components/DivisionDetail/DivisionDetailTabs.css';
import './TeamDetailPage.css';

// Роли представителей команды в турнирной заявке (tournament_team_roles.tournament_role).
// Названия — те же, что в LMS, чтобы человек видел одну и ту же должность везде.
const STAFF_ROLE_LABELS = {
  team_manager: 'Руководитель команды (подписант)',
  team_admin: 'Администратор команды',
  coach: 'Тренер команды',
};

const POSITION_LABELS = {
  goalie: 'Вратарь',
  defense: 'Защитник',
  forward: 'Нападающий',
};

// Документы допуска. Какие из них показывать, решает бэкенд по настройкам дивизиона
// (divisions.req_med_cert / req_insurance / req_consent) — здесь только подписи.
const DOCUMENT_LABELS = {
  medical: 'Медицинская справка',
  insurance: 'Страховка',
  consent: 'Согласие на обработку данных',
};

function PersonPhoto({ url, className }) {
  return url ? (
    <img src={getImageUrl(url)} alt="" className={className} />
  ) : (
    <div className={`${className} ${className}--placeholder`} />
  );
}

// Сегодняшняя дата в том же формате, в каком приходят сроки документов ('YYYY-MM-DD').
// Собираем из локальных компонентов, а не через toISOString() — тот отдаёт UTC и в наших
// часовых поясах до утра показывал бы вчерашний день.
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isDocumentValid = (doc) => {
  if (!doc.present) return false;
  // Просроченный документ допуска не даёт — показываем его так же, как отсутствующий,
  // а точную дату человек увидит в подсказке.
  if (!doc.expiresAt) return true;
  return doc.expiresAt >= todayIso();
};

const documentHint = (doc) => {
  if (!doc.present) return 'Нет документа';
  if (!doc.expiresAt) return 'Есть, срок не указан';
  return isDocumentValid(doc)
    ? `Действует до ${formatBirthDate(doc.expiresAt)}`
    : `Срок истёк ${formatBirthDate(doc.expiresAt)}`;
};

const disqualificationHint = (dq) => {
  const parts = [];
  if (dq.gamesLeft > 0) parts.push(`Осталось матчей: ${dq.gamesLeft}`);
  if (dq.until) parts.push(`Действует до ${formatBirthDate(dq.until)}`);
  if (dq.manual) parts.push('До решения СДК');
  return parts.length > 0 ? parts.join(' · ') : 'Действует';
};

// Бейдж с подсказкой по клику (а не по наведению — на телефоне hover недоступен).
// Подсказка уходит порталом в body: таблица состава прокручивается по горизонтали
// (overflow на обёртке), и внутри неё всплывающий блок был бы обрезан.
const TIP_HALF_WIDTH = 160;

function TipBadge({ className, tipTitle, tipText, children }) {
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    // Клик по своей же кнопке пропускаем — её обработчик сам закроет подсказку
    // (иначе повторный клик успевал бы закрыть и тут же открыть её заново).
    const closeIfOutside = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      setPos(null);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPos(null);
    };
    document.addEventListener('pointerdown', closeIfOutside);
    window.addEventListener('keydown', onKeyDown);
    // true — ловим прокрутку и внутренних контейнеров (обёртка таблицы), а не только окна
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return setPos(null);
    const rect = btnRef.current.getBoundingClientRect();
    // Описание квалификации бывает в несколько абзацев, поэтому подсказку, которой не
    // хватает места сверху, разворачиваем вниз, а по горизонтали прижимаем к краю экрана.
    const minLeft = TIP_HALF_WIDTH + 12;
    const maxLeft = window.innerWidth - TIP_HALF_WIDTH - 12;
    const center = rect.left + rect.width / 2;
    setPos({
      top: rect.top < 300 ? rect.bottom : rect.top,
      left: maxLeft > minLeft ? Math.min(Math.max(center, minLeft), maxLeft) : center,
      below: rect.top < 300,
    });
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        onClick={toggle}
        aria-label={`${tipTitle}: ${tipText}`}
      >
        {children}
      </button>
      {pos &&
        createPortal(
          <span
            className={`team-roster__tip${pos.below ? ' team-roster__tip--below' : ''}`}
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
          >
            <b>{tipTitle}</b>
            {tipText}
          </span>,
          document.body
        )}
    </>
  );
}

function DocumentBadges({ documents }) {
  if (documents.length === 0) return <span className="team-roster__muted">—</span>;

  return (
    <span className="team-roster__docs">
      {documents.map((doc) => (
        <TipBadge
          key={doc.key}
          className={`team-roster__doc-btn team-roster__doc-btn--${isDocumentValid(doc) ? 'ok' : 'missing'}`}
          tipTitle={DOCUMENT_LABELS[doc.key] || doc.key}
          tipText={documentHint(doc)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 2.5h7l5 5v14a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 21.5v-17A1.5 1.5 0 0 1 6 2.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path d="M13 2.5v5h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M8.5 12.5h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </TipBadge>
      ))}
    </span>
  );
}

// Левая, общая для вратарей и полевых часть таблицы состава: номер, фото, ФИО,
// дисквалификация, квалификация, документы допуска и возраст.
// Подписи есть только у номера, фото и ФИО — остальные колонки читаются сами по себе.
// Дальше у каждой позиции своя статистика, отделённая вертикальной линией
// (team-roster__col-sep на первой её колонке).
const PLAYER_HEAD_CELLS = (
  <>
    <th className="team-roster__col-number">№</th>
    <th className="team-roster__col-photo">Фото</th>
    <th className="team-roster__col-name">Игрок</th>
    <th className="team-roster__col-dq" />
    <th className="team-roster__col-qual" />
    <th />
    <th className="team-roster__col-age" />
  </>
);

function PlayerCells({ player }) {
  return (
    <>
      <td className="team-roster__col-number">{player.jerseyNumber ?? '—'}</td>
      <td className="team-roster__col-photo">
        <PersonPhoto url={player.photoUrl} className="team-roster__photo" />
      </td>
      <td className="team-roster__col-name">
        {player.fullName}
        {player.isCaptain && <span className="team-roster__badge">К</span>}
        {player.isAssistant && <span className="team-roster__badge">А</span>}
      </td>
      <td className="team-roster__col-dq">
        {player.disqualification && (
          <TipBadge
            className="team-roster__dq-btn"
            tipTitle="Дисквалификация"
            tipText={disqualificationHint(player.disqualification)}
          >
            Дискв.
          </TipBadge>
        )}
      </td>
      <td className="team-roster__col-qual">
        {player.qualification ? (
          <TipBadge
            className="team-roster__qual-btn"
            tipTitle={player.qualification.name}
            tipText={player.qualification.description || 'Описание квалификации не заполнено'}
          >
            {player.qualification.short}
          </TipBadge>
        ) : (
          <span className="team-roster__muted">—</span>
        )}
      </td>
      <td>
        <DocumentBadges documents={player.documents} />
      </td>
      <td className="team-roster__col-age">{formatAge(player.age) || '—'}</td>
    </>
  );
}

// Статистика игрока, не оплатившего индивидуальный взнос (если в дивизионе включено
// divisions.hide_stats_unpaid). Бэкенд такие цифры не отдаёт вовсе (приходит null),
// поэтому на их месте — размытая заглушка. Количество игр не скрывается и через
// этот помощник не проходит.
const statValue = (value, hidden) =>
  hidden ? <span className="team-roster__stat-hidden">•••</span> : value;

function SkaterTable({ title, players }) {
  if (players.length === 0) return null;
  return (
    <div className="team-roster__group">
      <h4 className="team-roster__group-title">{title}</h4>
      <div className="team-roster__table-wrap">
        <table className="team-roster__table">
          <thead>
            <tr>
              {PLAYER_HEAD_CELLS}
              <th className="team-roster__col-sep">И</th>
              <th>Г</th>
              <th>П</th>
              <th>О</th>
              <th>ШТР</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.rosterId}>
                <PlayerCells player={p} />
                <td className="team-roster__col-sep">{p.gamesPlayed}</td>
                <td>{statValue(p.goals, p.statsHidden)}</td>
                <td>{statValue(p.assists, p.statsHidden)}</td>
                <td className="team-roster__points">{statValue(p.points, p.statsHidden)}</td>
                <td>{statValue(p.penaltyMinutes, p.statsHidden)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GoalieTable({ players }) {
  if (players.length === 0) return null;
  return (
    <div className="team-roster__group">
      <h4 className="team-roster__group-title">Вратари</h4>
      <div className="team-roster__table-wrap">
        <table className="team-roster__table">
          <thead>
            {/* Колонок статистики столько же, сколько у полевых (5), поэтому обе таблицы
                совпадают по вертикали без добивки пустыми ячейками */}
            <tr>
              {PLAYER_HEAD_CELLS}
              <th className="team-roster__col-sep">И</th>
              <th>И&quot;0&quot;</th>
              <th>П</th>
              <th>ПШ</th>
              <th>ШТР</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.rosterId}>
                <PlayerCells player={p} />
                <td className="team-roster__col-sep">{p.gamesPlayed}</td>
                <td>{statValue(p.shutouts, p.statsHidden)}</td>
                <td>{statValue(p.assists, p.statsHidden)}</td>
                <td>{statValue(p.goalsAgainst, p.statsHidden)}</td>
                <td>{statValue(p.penaltyMinutes, p.statsHidden)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Игроки, которые сейчас на лёд не выходят: без допуска (снят тумблер в LMS) либо с
// активной дисквалификацией. Оба списка устроены одинаково — вместо колонок статистики
// амплуа. Порядок (вратари → защитники → нападающие, внутри позиции по алфавиту)
// приходит готовым с бэкенда, здесь только отрисовка. Пустой список блок не рисует вовсе.
function SidelinedSection({ title, players }) {
  if (players.length === 0) return null;

  return (
    <div className="glass-card team-roster">
      <h3 className="division-tab__title team-detail__block-title">{title}</h3>
      <div className="team-roster__table-wrap">
        <table className="team-roster__table">
          <thead>
            <tr>
              {PLAYER_HEAD_CELLS}
              <th className="team-roster__col-sep team-roster__col-role">Амплуа</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.rosterId}>
                <PlayerCells player={p} />
                <td className="team-roster__col-sep team-roster__col-role">
                  {POSITION_LABELS[p.position] || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Вратари, защитники и нападающие — один блок «Состав» с тремя таблицами внутри:
// у вратарей своя статистика, поэтому свести всё в одну таблицу нельзя.
function RosterSection({ data }) {
  const allPlayers = [...data.goalies, ...data.defensemen, ...data.forwards];
  // Пустой состав бывает по двум разным причинам, и путать их нельзя: либо в заявке
  // действительно никого, либо люди есть, но все они разошлись по блокам ниже
  // (без допуска / дисквалифицированы) — и «не заявлен» противоречило бы этим спискам.
  if (allPlayers.length === 0) {
    const hasSidelined = (data.notAdmitted?.length || 0) + (data.disqualified?.length || 0) > 0;
    return (
      <PlaceholderSection>
        {hasSidelined
          ? 'Сейчас ни один игрок команды не может выйти на матч.'
          : 'Состав команды пока не заявлен.'}
      </PlaceholderSection>
    );
  }

  return (
    <div className="glass-card team-roster">
      <h3 className="division-tab__title team-detail__block-title">Состав и статистика игроков</h3>
      <GoalieTable players={data.goalies} />
      <SkaterTable title="Защитники" players={data.defensemen} />
      <SkaterTable title="Нападающие" players={data.forwards} />

      {allPlayers.some((p) => p.statsHidden) && (
        <p className="team-roster__note">
          Статистика игроков, не оплативших индивидуальный взнос, скрыта.
        </p>
      )}
    </div>
  );
}

function StaffSection({ staff }) {
  if (staff.length === 0) return null;
  return (
    <div className="glass-card">
      <h3 className="division-tab__title team-detail__block-title">Представители команды</h3>
      <div className="team-staff__grid">
        {staff.map((person) => (
          <div key={person.userId} className="team-staff__card">
            <PersonPhoto url={person.photoUrl} className="team-staff__photo" />
            <div>
              <div className="team-staff__name">{person.fullName}</div>
              <div className="team-staff__roles">
                {person.roles.map((role) => (
                  <div key={role}>{STAFF_ROLE_LABELS[role] || role}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// backTo/backLabel — та же связка, что у DivisionDetailPage: страница-список, с которой
// начинается цепочка "Дивизионы «Любитель» / <название дивизиона> / <название команды>".
export default function TeamDetailPage({ backTo, backLabel }) {
  const { id, teamId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPhotoOpen(false);
    apiGet(`/api/championship/teams/${teamId}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  return (
    <div className="page-container">
      <div className="team-detail__breadcrumb">
        <Link to={backTo}>{backLabel}</Link>
        {' / '}
        {data?.team ? <Link to={`${backTo}/${id}`}>{data.team.division.name}</Link> : '…'}
        {' / '}
        <span className="team-detail__breadcrumb-current">{data?.team?.name || '…'}</span>
      </div>

      {error && <PlaceholderSection>Не удалось загрузить страницу команды: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && data && (
        <>
          <div className="team-detail__header">
            {data.team.logoUrl ? (
              <img src={getImageUrl(data.team.logoUrl)} alt="" className="team-detail__logo" />
            ) : (
              <div className="team-detail__logo team-detail__logo--placeholder" />
            )}
            <h2 className="team-detail__name font-display">{data.team.name}</h2>
          </div>

          <div className="team-detail__top-grid">
            <div className="glass-card team-detail__about">
              <h3 className="division-tab__title team-detail__block-title">О команде</h3>
              {data.team.description ? (
                <p className="team-detail__about-text">{data.team.description}</p>
              ) : (
                <p className="team-detail__about-empty">Описание команды пока не добавлено.</p>
              )}
            </div>

            <div className="glass-card team-detail__photo-card">
              <h3 className="division-tab__title team-detail__block-title">Командное фото</h3>
              {data.team.teamPhotoUrl ? (
                <button
                  type="button"
                  className="team-detail__photo-btn"
                  onClick={() => setPhotoOpen(true)}
                  aria-label="Открыть командное фото"
                >
                  <img
                    src={getImageUrl(data.team.teamPhotoUrl)}
                    alt={`Командное фото: ${data.team.name}`}
                    className="team-detail__photo"
                  />
                </button>
              ) : (
                <div className="team-detail__photo-placeholder">Общего фото команды нет</div>
              )}
            </div>

            <div className="glass-card team-detail__jerseys">
              <h3 className="division-tab__title team-detail__block-title">Командные майки</h3>
              <div className="team-detail__jerseys-grid">
                <div className="team-detail__jersey">
                  {data.team.jerseyDarkUrl ? (
                    <img src={getImageUrl(data.team.jerseyDarkUrl)} alt="Домашняя форма" />
                  ) : (
                    <div className="team-detail__jersey-placeholder">Фото домашнего джерси</div>
                  )}
                  <span>Домашняя</span>
                </div>
                <div className="team-detail__jersey">
                  {data.team.jerseyLightUrl ? (
                    <img src={getImageUrl(data.team.jerseyLightUrl)} alt="Гостевая форма" />
                  ) : (
                    <div className="team-detail__jersey-placeholder">Фото гостевого джерси</div>
                  )}
                  <span>Гостевая</span>
                </div>
              </div>
              <div className="team-detail__jerseys-credit">создано ИИ</div>
            </div>
          </div>

          <RosterSection data={data} />

          <SidelinedSection title="Недопущенные игроки" players={data.notAdmitted || []} />

          <SidelinedSection title="Дисквалифицированные" players={data.disqualified || []} />

          <StaffSection staff={data.staff} />

          {photoOpen && (
            <PhotoLightbox
              photos={[{ url: getImageUrl(data.team.teamPhotoUrl) }]}
              index={0}
              title={data.team.name}
              onClose={() => setPhotoOpen(false)}
              onIndexChange={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}
