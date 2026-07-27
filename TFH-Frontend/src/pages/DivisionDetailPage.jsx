import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import PageHeading from '../components/PageHeading.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import Loader from '../components/Loader.jsx';
import StandingsTab from '../components/DivisionDetail/StandingsTab.jsx';
import CalendarTab from '../components/DivisionDetail/CalendarTab.jsx';
import TeamsTab from '../components/DivisionDetail/TeamsTab.jsx';
import './DivisionDetailPage.css';

const TABS = [
  { key: 'standings', label: 'Таблица' },
  { key: 'calendar', label: 'Календарь' },
  { key: 'teams', label: 'Команды' },
  { key: 'sdk', label: 'СДК' },
  { key: 'regulations', label: 'Положение' },
];

// backTo/backLabel — куда и с какой подписью вести хлебную крошку "‹ Дивизионы «Любитель»":
// приходят статично из маршрута в App.jsx (страница-список, с которой сюда попадают).
export default function DivisionDetailPage({ backTo, backLabel }) {
  const { id } = useParams();
  const [division, setDivision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('standings');

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
      <Link to={backTo} className="division-detail__back">
        ‹ {backLabel}
      </Link>

      {error && <PlaceholderSection>Не удалось загрузить страницу: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && division && (
        <>
          <div className="division-detail__header">
            <PageHeading title={division.name} />
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
            {division.seasonName && (
              <span className="division-detail__season">Сезон {division.seasonName}</span>
            )}
          </div>

          {tab === 'standings' && <StandingsTab divisionId={id} teamLinkBase={`${backTo}/${id}/komanda`} />}
          {tab === 'calendar' && <CalendarTab divisionId={id} />}
          {tab === 'teams' && <TeamsTab divisionId={id} teamLinkBase={`${backTo}/${id}/komanda`} />}
          {tab === 'sdk' && <PlaceholderSection />}
          {tab === 'regulations' && <PlaceholderSection />}
        </>
      )}
    </div>
  );
}
