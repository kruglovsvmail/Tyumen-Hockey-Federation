import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import PageHeading from '../components/PageHeading.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import Loader from '../components/Loader.jsx';
import StandingsTab from '../components/DivisionDetail/StandingsTab.jsx';
import CalendarTab from '../components/DivisionDetail/CalendarTab.jsx';
import TeamsTab from '../components/DivisionDetail/TeamsTab.jsx';
import ReserveGoaliesModal from '../components/DivisionDetail/ReserveGoaliesModal.jsx';
import './DivisionDetailPage.css';

// Отдельным чанком: вместе с вкладкой уезжает pdf.js (~350 КБ), и в бандле
// остальных страниц сайта ему делать нечего
const RegulationsTab = lazy(() => import('../components/DivisionDetail/RegulationsTab.jsx'));

const TABS = [
  { key: 'standings', label: 'Таблица' },
  { key: 'calendar', label: 'Календарь' },
  { key: 'teams', label: 'Команды' },
  // СДК отсюда убран: и таблица штрафов, и протоколы одни на весь сезон,
  // а не на дивизион — они живут на отдельной странице /sdk
  { key: 'regulations', label: 'Положения' },
];

// backTo/backLabel — куда и с какой подписью вести хлебную крошку "‹ Дивизионы «Любитель»":
// приходят статично из маршрута в App.jsx (страница-список, с которой сюда попадают).
export default function DivisionDetailPage({ backTo, backLabel }) {
  const { id } = useParams();
  const [division, setDivision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('standings');
  const [isReserveOpen, setIsReserveOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/championship/divisions/${id}`)
      .then((data) => setDivision(data.division))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="page-container">
      {/* Верхний ряд: хлебная крошка слева, резервные вратари справа. Кнопка стоит
          над меню дивизиона, а не среди вкладок — это не раздел страницы, а
          вспомогательное действие. Условие на division: до загрузки его ещё нет. */}
      <div className="division-detail__topbar">
        <Link to={backTo} className="division-detail__back">
          ‹ {backLabel}
        </Link>

        {division?.hasReserveGoalies && (
          <button
            type="button"
            className="division-detail__reserve-link"
            onClick={() => setIsReserveOpen(true)}
          >
            Резервные вратари
          </button>
        )}
      </div>

      {error && <PlaceholderSection>Не удалось загрузить страницу: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && division && (
        <>
          {/* Сезон ушёл из отдельного бейджа в заголовок: он часть названия
              соревнования, а не самостоятельный элемент управления */}
          <div className="division-detail__header">
            <PageHeading
              title={division.seasonName ? (
                <>
                  {division.name}
                  {/* Отступы вокруг разделителя задаёт CSS: подряд идущие пробелы
                      в разметке схлопнулись бы в один */}
                  <span className="division-detail__season-sep">|</span>
                  <span className="division-detail__season-name">{division.seasonName}</span>
                </>
              ) : division.name}
            />
            <div className="division-detail__tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`division-detail__tab${tab === t.key ? ' is-active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* key — чтобы при переключении вкладки обёртка пересоздалась и анимация
              появления проигралась заново */}
          <div className="content-in" key={tab}>
            {tab === 'standings' && <StandingsTab divisionId={id} teamLinkBase={`${backTo}/${id}/komanda`} />}
            {tab === 'calendar' && <CalendarTab divisionId={id} />}
            {tab === 'teams' && <TeamsTab divisionId={id} teamLinkBase={`${backTo}/${id}/komanda`} />}
            {tab === 'regulations' && (
              <Suspense fallback={<Loader />}>
                <RegulationsTab divisionId={id} />
              </Suspense>
            )}
          </div>

          {isReserveOpen && (
            <ReserveGoaliesModal divisionId={id} onClose={() => setIsReserveOpen(false)} />
          )}
        </>
      )}
    </div>
  );
}
