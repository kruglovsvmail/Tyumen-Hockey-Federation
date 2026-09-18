import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import Loader from '../Loader.jsx';
import PlaceholderSection from '../PlaceholderSection.jsx';
import { getImageUrl } from '../../utils/getImageUrl.js';
import TeamsGridSettingsModal from './TeamsGridSettingsModal.jsx';
import './DivisionDetailTabs.css';

export default function TeamsTab({ divisionId, teamLinkBase }) {
  const { isAdmin } = useAdmin();
  const [teams, setTeams] = useState([]);
  // saved — что лежит на сервере, draft — что сейчас нарисовано. Для посетителя они
  // всегда совпадают, расходятся только пока админ крутит бегунки в окне настройки:
  // draft уходит в CSS-переменные сетки сразу, и она перерисовывается под руками.
  const [savedGrid, setSavedGrid] = useState(null);
  const [draftGrid, setDraftGrid] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiGet(`/api/championship/divisions/${divisionId}/teams`)
      .then((data) => {
        setTeams(data.teams);
        setSavedGrid(data.grid);
        setDraftGrid(data.grid);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId]);

  const handleGridSaved = (grid) => {
    setSavedGrid(grid);
    setDraftGrid(grid);
    setIsSettingsOpen(false);
  };

  // Закрыли без сохранения — сетка возвращается к тому, что на сервере
  const handleSettingsClose = () => {
    setDraftGrid(savedGrid);
    setIsSettingsOpen(false);
  };

  if (error) return <PlaceholderSection>Не удалось загрузить команды: {error}</PlaceholderSection>;
  if (loading) return <Loader />;
  if (teams.length === 0) return <PlaceholderSection>В дивизионе пока нет допущенных команд.</PlaceholderSection>;

  return (
    <div className="teams-tab">
      {isAdmin && (
        <div className="teams-tab__toolbar">
          <button
            type="button"
            className="admin-pill"
            onClick={() => setIsSettingsOpen(true)}
            disabled={isSettingsOpen}
          >
            ⚙ Настроить сетку
          </button>
        </div>
      )}

      <div
        className="teams-tab-grid"
        style={{ '--teams-cols': draftGrid.columns, '--teams-logo': `${draftGrid.logoSize}px` }}
      >
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

      {isSettingsOpen && (
        <TeamsGridSettingsModal
          divisionId={divisionId}
          draft={draftGrid}
          saved={savedGrid}
          onChange={setDraftGrid}
          onClose={handleSettingsClose}
          onSaved={handleGridSaved}
        />
      )}
    </div>
  );
}
