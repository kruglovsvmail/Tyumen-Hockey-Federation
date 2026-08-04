import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client.js';
import Loader from '../Loader.jsx';
import PlaceholderSection from '../PlaceholderSection.jsx';
import { getImageUrl } from '../../utils/getImageUrl.js';
import './DivisionDetailTabs.css';

export default function TeamsTab({ divisionId, teamLinkBase }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/championship/divisions/${divisionId}/teams`)
      .then((data) => setTeams(data.teams))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId]);

  if (error) return <PlaceholderSection>Не удалось загрузить команды: {error}</PlaceholderSection>;
  if (loading) return <Loader />;
  if (teams.length === 0) return <PlaceholderSection>В дивизионе пока нет допущенных команд.</PlaceholderSection>;

  return (
    <div className="teams-tab-grid">
      {teams.map((t) => (
        <Link key={t.tournamentTeamId} to={`${teamLinkBase}/${t.tournamentTeamId}`} className="teams-tab__card">
          <div className="teams-tab__logo-wrap">
            {t.logoUrl ? (
              <img src={getImageUrl(t.logoUrl)} alt="" className="teams-tab__logo" />
            ) : (
              <div className="teams-tab__logo teams-tab__logo--placeholder" />
            )}
          </div>
          <div className="teams-tab__name">{t.name}</div>
        </Link>
      ))}
    </div>
  );
}
