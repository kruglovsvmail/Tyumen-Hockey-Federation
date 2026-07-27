import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../api/client.js';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import Loader from '../components/Loader.jsx';
import { getImageUrl } from '../utils/getImageUrl.js';
import '../components/DivisionDetail/DivisionDetailTabs.css';
import './TeamDetailPage.css';

function SkaterTable({ title, players }) {
  if (players.length === 0) return null;
  return (
    <div className="glass-card team-roster">
      <h3 className="division-tab__title">{title}</h3>
      <div className="team-roster__table-wrap">
        <table className="team-roster__table">
          <thead>
            <tr>
              <th>№</th>
              <th className="team-roster__col-name">Игрок</th>
              <th>И</th>
              <th>Г</th>
              <th>А</th>
              <th>О</th>
              <th>ШТР</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.rosterId}>
                <td>{p.jerseyNumber ?? '—'}</td>
                <td className="team-roster__col-name">
                  {p.fullName}
                  {p.isCaptain && <span className="team-roster__badge">К</span>}
                  {p.isAssistant && <span className="team-roster__badge">А</span>}
                </td>
                <td>{p.gamesPlayed}</td>
                <td>{p.goals}</td>
                <td>{p.assists}</td>
                <td className="team-roster__points">{p.points}</td>
                <td>{p.penaltyMinutes}</td>
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
    <div className="glass-card team-roster">
      <h3 className="division-tab__title">Вратари</h3>
      <div className="team-roster__table-wrap">
        <table className="team-roster__table">
          <thead>
            <tr>
              <th>№</th>
              <th className="team-roster__col-name">Игрок</th>
              <th>И</th>
              <th>ПШ</th>
              <th>%ОБ</th>
              <th>ШТР</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.rosterId}>
                <td>{p.jerseyNumber ?? '—'}</td>
                <td className="team-roster__col-name">
                  {p.fullName}
                  {p.isCaptain && <span className="team-roster__badge">К</span>}
                  {p.isAssistant && <span className="team-roster__badge">А</span>}
                </td>
                <td>{p.gamesPlayed}</td>
                <td>{p.goalsAgainst}</td>
                <td>{p.savePercent}</td>
                <td>{p.penaltyMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  useEffect(() => {
    setLoading(true);
    setError(null);
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
              <h3 className="division-tab__title">О команде</h3>
              {data.team.description ? (
                <p className="team-detail__about-text">{data.team.description}</p>
              ) : (
                <p className="team-detail__about-empty">Описание команды пока не добавлено.</p>
              )}
            </div>

            <div className="glass-card team-detail__jerseys">
              <h3 className="division-tab__title">Джерси</h3>
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
            </div>
          </div>

          <GoalieTable players={data.goalies} />
          <SkaterTable title="Защитники" players={data.defensemen} />
          <SkaterTable title="Нападающие" players={data.forwards} />

          {data.goalies.length === 0 && data.defensemen.length === 0 && data.forwards.length === 0 && (
            <PlaceholderSection>Состав команды пока не заявлен.</PlaceholderSection>
          )}
        </>
      )}
    </div>
  );
}
