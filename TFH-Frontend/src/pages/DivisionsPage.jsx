import { useEffect, useState } from 'react';
import { apiGet } from '../api/client.js';
import PageHeading from '../components/PageHeading.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import DivisionCard from '../components/DivisionCard.jsx';
import SeasonDropdown from '../components/SeasonDropdown.jsx';
import Loader from '../components/Loader.jsx';
import './DivisionsPage.css';

// group — какие divisions.classification из общей БД показывать (см. ChampionshipController.js на бэкенде)
export default function DivisionsPage({ title, group }) {
  const [seasons, setSeasons] = useState([]);
  const [seasonId, setSeasonId] = useState(null);
  const [divisions, setDivisions] = useState([]);
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
    apiGet(`/api/championship/divisions?group=${group}&seasonId=${seasonId}`)
      .then((data) => setDivisions(data.divisions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [group, seasonId]);

  return (
    <div className="page-container">
      <div className="divisions-header">
        <PageHeading title={title} />
        {seasons.length > 0 && <SeasonDropdown seasons={seasons} value={seasonId} onChange={setSeasonId} />}
      </div>

      {error && <PlaceholderSection>Не удалось загрузить данные: {error}</PlaceholderSection>}

      {!error && loading && <Loader />}

      {!error && !loading && divisions.length === 0 && (
        <PlaceholderSection>В этом сезоне дивизионов пока нет.</PlaceholderSection>
      )}

      {!error && !loading && divisions.length > 0 && (
        <div className="divisions-grid">
          {divisions.map((d) => (
            <DivisionCard key={d.id} division={d} />
          ))}
        </div>
      )}
    </div>
  );
}
