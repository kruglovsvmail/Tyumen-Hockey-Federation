import { useEffect, useState } from 'react';
import { apiGet } from '../api/client.js';
import PageHeading from '../components/PageHeading.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import DivisionCard from '../components/DivisionCard.jsx';
import SeasonDropdown from '../components/SeasonDropdown.jsx';
import Loader from '../components/Loader.jsx';
import './DivisionsPage.css';

// Плоский список турниров (divisions.is_tournament = true) — та же сущность в БД,
// что и дивизионы "Чемпионата", но без разбивки по classification (см. ChampionshipController.js).
export default function TournamentsPage({ title }) {
  const [seasons, setSeasons] = useState([]);
  const [seasonId, setSeasonId] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/api/championship/seasons')
      .then((data) => {
        setSeasons(data.seasons);
        const initial = data.seasons.find((s) => s.isActive) || data.seasons[0];
        if (initial) setSeasonId(initial.id);
        else setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    setLoading(true);
    apiGet(`/api/championship/tournaments?seasonId=${seasonId}`)
      .then((data) => setTournaments(data.tournaments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [seasonId]);

  return (
    <div className="page-container">
      <div className="divisions-header">
        <PageHeading title={title} centered />
        {seasons.length > 0 && <SeasonDropdown seasons={seasons} value={seasonId} onChange={setSeasonId} />}
      </div>

      {error && <PlaceholderSection>Не удалось загрузить данные: {error}</PlaceholderSection>}

      {!error && loading && <Loader />}

      {!error && !loading && tournaments.length === 0 && (
        <PlaceholderSection>В этом сезоне турниров пока нет.</PlaceholderSection>
      )}

      {!error && !loading && tournaments.length > 0 && (
        <div className="divisions-grid">
          {tournaments.map((t) => (
            <DivisionCard key={t.id} division={t} labelWord="" />
          ))}
        </div>
      )}
    </div>
  );
}
