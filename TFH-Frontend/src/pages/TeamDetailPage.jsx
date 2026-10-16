import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import PhotoLightbox from '../components/PhotoLightbox.jsx';
import ConsentFormModal from '../components/ConsentFormModal.jsx';
import { TipBadge, DocumentBadge, isDocumentValid } from '../components/DocumentBadge.jsx';
import Loader from '../components/Loader.jsx';
import { getImageUrl } from '../utils/getImageUrl.js';
import { formatAge, formatBirthDate } from '../utils/formatDate.js';
import { getEquipmentMark } from '../utils/equipmentMarks.js';
import { useClampOverflow } from '../hooks/useClampOverflow.js';
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

// Открытие формы согласия. Кнопка живёт глубоко внизу дерева: страница -> RosterSection
// или SidelinedSection -> таблица -> PlayerCells -> DocumentBadges. Тащить обработчик
// пропсами через пять компонентов ради одной кнопки — только шум в их сигнатурах,
// поэтому берём его из контекста.
const ConsentSigningContext = createContext(null);

// Настройки обозначений экипировки приходят с составом; их читает PlayerCells,
// а он лежит глубоко в таблицах — поэтому контекст, а не проброс через все секции.
const EquipmentMarksContext = createContext(null);

function PersonPhoto({ url, className }) {
  return url ? (
    <img src={getImageUrl(url)} alt="" className={className} />
  ) : (
    <div className={`${className} ${className}--placeholder`} />
  );
}

// Квалификация лиговая и меняется целиком по лиге, поэтому в старом сезоне у игрока
// показан её сегодняшний бейдж. Чтобы это не выглядело ошибкой, под бейджем к описанию
// добавляем историю смен. Одна запись — это и есть текущая квалификация, истории нет.
const qualificationHint = (qual) => {
  const lines = [qual.description || 'Описание квалификации не заполнено'];
  const history = qual.history || [];

  if (history.length > 1) {
    lines.push('', 'История квалификаций:');
    history.forEach((h) => {
      lines.push(h.to
        ? `${h.short}: ${formatBirthDate(h.from)} — ${formatBirthDate(h.to)}`
        : `${h.short}: с ${formatBirthDate(h.from)}`);
    });
  }

  return lines.join('\n');
};

const disqualificationHint = (dq) => {
  const parts = [];
  if (dq.gamesLeft > 0) parts.push(`Осталось матчей: ${dq.gamesLeft}`);
  if (dq.until) parts.push(`Действует до ${formatBirthDate(dq.until)}`);
  if (dq.manual) parts.push('До решения СДК');
  return parts.length > 0 ? parts.join(' · ') : 'Действует';
};

function DocumentBadges({ player }) {
  const onSignConsent = useContext(ConsentSigningContext);
  const documents = player.documents;
  if (documents.length === 0) return <span className="team-roster__muted">—</span>;

  // Согласие игрок подписывает сам, прямо здесь: в подсказке появляется кнопка,
  // открывающая форму. Показываем её и когда документа нет, и когда он просрочен —
  // иначе игрок с истёкшим согласием не смог бы продлить его без руководителя команды.
  // Остальные документы (медсправка, страховка) загружает команда — у них кнопки нет.
  const signAction = (doc) => (
    doc.key === 'consent' && !isDocumentValid(doc)
      ? (
        <button
          type="button"
          className="team-roster__tip-action"
          onClick={() => onSignConsent(player.userId)}
        >
          Заполнить
        </button>
      )
      : null
  );

  return (
    <span className="team-roster__docs">
      {documents.map((doc) => (
        <DocumentBadge
          key={doc.key}
          doc={doc}
          label={DOCUMENT_LABELS[doc.key] || doc.key}
          action={onSignConsent ? signAction(doc) : null}
        />
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

// Маленькие строчные буквы рядом с фамилией: по нажатию всплывает пояснение.
function EquipmentMarkBadge({ birthDate, position }) {
  const settings = useContext(EquipmentMarksContext);
  const mark = getEquipmentMark(birthDate, settings, position);
  if (!mark) return null;

  return (
    <TipBadge className="team-roster__equip-btn" tipTitle={mark.title} tipText={mark.text}>
      {mark.code}
    </TipBadge>
  );
}

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
        <EquipmentMarkBadge birthDate={player.birthDate} position={player.position} />
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
            tipText={qualificationHint(player.qualification)}
          >
            {player.qualification.short}
          </TipBadge>
        ) : (
          <span className="team-roster__muted">—</span>
        )}
      </td>
      <td>
        <DocumentBadges player={player} />
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
              {/* ПБ — победная шайба: та, после которой отрыв уже не был отыгран,
                  а не последняя шайба матча. В матчах, решённых серией буллитов,
                  не присуждается никому. */}
              <th title="Победные шайбы">ПБ</th>
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
                <td>{statValue(p.gameWinningGoals, p.statsHidden)}</td>
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
            {/* Колонок статистики должно быть столько же, сколько у полевых, иначе
                таблицы разъезжаются по вертикали. У полевых их шесть (появилась ПБ),
                у вратарей содержательных пять — шестая пустая. Если для вратарей
                найдётся нужный показатель, он встанет на её место. */}
            <tr>
              {PLAYER_HEAD_CELLS}
              <th className="team-roster__col-sep">И</th>
              <th>И&quot;0&quot;</th>
              <th>П</th>
              <th>ПШ</th>
              <th aria-hidden="true"></th>
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
                <td aria-hidden="true"></td>
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
  // Пока заявку проверяет лига, недопущенных бэкенд не отдаёт (см. getTeamDetail) —
  // пустой состав тогда значит «ещё не проверили», а не «не заявили».
  if (allPlayers.length === 0) {
    const hasSidelined = (data.notAdmitted?.length || 0) + (data.disqualified?.length || 0) > 0;
    const isUnderReview = data.team?.applicationStatus === 'pending';
    return (
      <PlaceholderSection>
        {isUnderReview
          ? 'Игроки ещё не добавлены или ещё не проверены.'
          : hasSidelined
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

// Документы допуска дивизион требует и с представителей — по тем же флагам, что и с игроков.
// Согласие представитель подписывает сам, той же формой: карточка получает те же значки.
function StaffSection({ staff }) {
  if (staff.length === 0) return null;
  return (
    <div className="glass-card">
      <h3 className="division-tab__title team-detail__block-title">Представители команды</h3>
      <div className="team-staff__grid">
        {staff.map((person) => (
          <div key={person.userId} className="team-staff__card">
            <PersonPhoto url={person.photoUrl} className="team-staff__photo" />
            <div className="team-staff__info">
              <div className="team-staff__name">{person.fullName}</div>
              {person.disqualification && (
                <div className="team-staff__disqualification">
                  <TipBadge
                    className="team-roster__dq-btn"
                    tipTitle="Дисквалификация"
                    tipText={disqualificationHint(person.disqualification)}
                  >
                    Дискв.
                  </TipBadge>
                </div>
              )}
              <div className="team-staff__roles">
                {person.roles.map((role) => (
                  <div key={role}>{STAFF_ROLE_LABELS[role] || role}</div>
                ))}
              </div>
            </div>
            {/* Документы — справа столбиком: в карточке представителя их немного,
                и рядом с ролями они читаются как продолжение текста, а не как статус. */}
            {person.documents?.length > 0 && (
              <div className="team-staff__docs">
                <DocumentBadges player={person} />
              </div>
            )}
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
  const [consentUserId, setConsentUserId] = useState(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const { ref: aboutRef, isTruncated: aboutTruncated } = useClampOverflow(data?.team?.description, aboutExpanded, 8);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPhotoOpen(false);
    setAboutExpanded(false);
    apiGet(`/api/championship/teams/${teamId}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  // Перечитывание состава после подписания согласия — чтобы иконка документа сразу
  // позеленела, а кнопка «Заполнить» из подсказки пропала. Без общего индикатора
  // загрузки: страница уже отрисована, и мигать ею из-за фонового обновления незачем.
  // Ошибку глотаем намеренно — согласие к этому моменту уже сохранено, и единственное
  // последствие неудачи здесь в том, что иконка обновится при следующем заходе.
  const refreshRoster = useCallback(() => {
    apiGet(`/api/championship/teams/${teamId}`).then(setData).catch(() => {});
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
                <>
                  <p
                    id="team-about-description"
                    ref={aboutRef}
                    className={`team-detail__about-text${aboutExpanded ? '' : ` team-detail__about-text--clamped${aboutTruncated ? ' team-detail__about-text--with-toggle' : ''}`}`}
                  >
                    {data.team.description}
                  </p>
                  {aboutTruncated && (
                    <button
                      type="button"
                      className="team-detail__about-toggle"
                      aria-controls="team-about-description"
                      aria-expanded={aboutExpanded}
                      onClick={() => setAboutExpanded((value) => !value)}
                    >
                      {aboutExpanded ? 'Свернуть' : 'Развернуть'}
                    </button>
                  )}
                </>
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
              <div className="team-detail__jerseys-credit">мокапы сгенерированы ИИ</div>
            </div>
          </div>

          {/* Кнопка «Заполнить» нужна во всех трёх списках: недопущенному и
              дисквалифицированному игроку согласие требуется ровно так же — недостающий
              документ как раз и бывает причиной, по которой человек ещё не допущен. */}
          <EquipmentMarksContext.Provider value={data.equipmentMarks}>
          <ConsentSigningContext.Provider value={setConsentUserId}>
            <RosterSection data={data} />

            <SidelinedSection title="Недопущенные игроки" players={data.notAdmitted || []} />

            <SidelinedSection title="Дисквалифицированные" players={data.disqualified || []} />

            {/* Представители внутри провайдера намеренно: согласие они подписывают сами,
                той же формой, и без контекста кнопка «Заполнить» у них бы не появилась. */}
            <StaffSection staff={data.staff} />
          </ConsentSigningContext.Provider>
          </EquipmentMarksContext.Provider>

          {/* Печатная заявка открывается в новой вкладке: это отдельный лист для принтера,
              без шапки сайта (см. TeamApplicationPrintPage). Пустую заявку печатать незачем —
              без игроков и представителей ссылки нет. */}
          {data.goalies.length + data.defensemen.length + data.forwards.length
            + (data.disqualified?.length || 0) + data.staff.length > 0 && (
            <div className="team-detail__print">
              <a
                href={`${backTo}/${id}/komanda/${teamId}/zayavka`}
                target="_blank"
                rel="noopener noreferrer"
                className="team-detail__print-link"
              >
                Распечатать заявку
              </a>
            </div>
          )}

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

      {/* Модалка вынесена из блока с данными: фоновое обновление состава после
          подписания не должно её закрывать. */}
      {consentUserId && (
        <ConsentFormModal
          appId={teamId}
          userId={consentUserId}
          onClose={() => setConsentUserId(null)}
          onSigned={refreshRoster}
        />
      )}
    </div>
  );
}
