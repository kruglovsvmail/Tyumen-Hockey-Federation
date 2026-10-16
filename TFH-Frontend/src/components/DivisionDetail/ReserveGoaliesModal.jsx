import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiGet } from '../../api/client.js';
import Loader from '../Loader.jsx';
import ConsentFormModal from '../ConsentFormModal.jsx';
import { DocumentBadge, isDocumentValid } from '../DocumentBadge.jsx';
import '../Modal.css';
import './ReserveGoaliesModal.css';

// Секунды на льду показываем целыми минутами: доли минуты у вратаря,
// вышедшего на пару матчей, ничего не добавляют.
const toMinutes = (seconds) => Math.round((seconds || 0) / 60);

const savePercent = (g) => {
  if (!g.tracksShots || !g.shotsAgainst) return '—';
  return `${((g.saves / g.shotsAgainst) * 100).toFixed(1)}%`;
};

// Номер в базе лежит как есть (+79991234567) — приводим к читаемому виду.
// Российский формат: 11 цифр с ведущей 7 или 8. Всё остальное показываем без
// изменений, чтобы не испортить нестандартный номер.
const formatPhone = (raw) => {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return raw;
};

export default function ReserveGoaliesModal({ divisionId, onClose }) {
  const [goalies, setGoalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Вратарь, который сейчас подписывает согласие (окно формы поверх списка)
  const [consentUserId, setConsentUserId] = useState(null);
  const consentOpenRef = useRef(false);
  consentOpenRef.current = consentUserId !== null;

  // Колонка согласия — только если лига требует его от резерва: тогда оно есть у всех
  const showConsent = goalies.some((g) => g.consent);

  const loadGoalies = () => apiGet(`/api/championship/divisions/${divisionId}/reserve-goalies`)
    .then((data) => setGoalies(data.goalies || []));

  useEffect(() => {
    loadGoalies()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [divisionId]);

  // Esc закрывает окно — как и клик по подложке. Пока поверх открыта форма согласия,
  // Esc закрывает только её: у формы свой обработчик
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !consentOpenRef.current) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Форма согласия — рядом с окном, а не внутри него: события из портала всплывают по
  // дереву React, и клик по форме закрыл бы окно списка через его подложку
  return (
    <>
      {createPortal(
        <div className="admin-modal-overlay" onClick={onClose}>
          <div className="admin-modal reserve-goalies" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__title font-display">Резервные вратари дивизиона</div>

            <p className="reserve-goalies__hint">
              Если ваш вратарь не выходит на матч, с любым из списка можно договориться напрямую.
              О замене нужно сообщить организторам лиги и секретарю матча до его начала.
            </p>

            {loading && <Loader />}
            {error && <div className="reserve-goalies__empty">Не удалось загрузить список: {error}</div>}

            {!loading && !error && goalies.length === 0 && (
              <div className="reserve-goalies__empty">В этом дивизионе резервные вратари пока не назначены.</div>
            )}

            {!loading && !error && goalies.length > 0 && (
              <div className="reserve-goalies__scroll">
                <table className="reserve-goalies__table">
                  <thead>
                    <tr>
                      <th className="reserve-goalies__name-cell">Вратарь</th>
                      <th className="reserve-goalies__phone-cell">Телефон</th>
                      <th title="Матчей сыграно">И</th>
                      <th title="Пропущено шайб">ПШ</th>
                      <th title="Отражено бросков">ОБ</th>
                      <th title="Процент отражённых бросков">%ОБ</th>
                      <th title="Матчи на ноль">СМ</th>
                      <th title="Минут на льду">Мин</th>
                      {showConsent && <th className="reserve-goalies__doc-cell" title="Согласие на обработку данных" />}
                    </tr>
                  </thead>
                  <tbody>
                    {goalies.map((g) => (
                      <tr
                        key={g.playerId}
                        className={`reserve-goalies__row${g.isBlocked || g.isUnavailable ? ' is-blocked' : ''}`}
                      >
                        <td className="reserve-goalies__name-cell">
                          <span className="reserve-goalies__name">
                            {g.lastName} {g.firstName}
                            {g.jerseyNumber != null ? ` · №${g.jerseyNumber}` : ''}
                          </span>

                          {g.teams.length > 0 && (
                            <span className="reserve-goalies__teams">Выходил за: {g.teams.join(', ')}</span>
                          )}
                          {g.note && <span className="reserve-goalies__teams">{g.note}</span>}

                          {/* Пометка только там, где она меняет дело: выход закрыт.
                              Наказание, которое резервным выходам не мешает, списку
                              неинтересно — как и его вид, срок и остаток матчей */}
                          {g.isBlocked && (
                            <span className="reserve-goalies__badge reserve-goalies__badge--blocked">
                              ДИСКВАЛ.
                            </span>
                          )}
                        </td>

                        <td className="reserve-goalies__phone-cell">
                          {/* Номер не приходит и у вратаря без обязательных документов:
                              пока лига его не допустит, договариваться с ним нельзя */}
                          {g.phone
                            ? <a className="reserve-goalies__phone" href={`tel:${g.phone}`}>{formatPhone(g.phone)}</a>
                            : g.isUnavailable
                              ? <span className="reserve-goalies__unavailable">Вратарь не доступен</span>
                              : '—'}
                        </td>

                        <td>{g.gamesPlayed}</td>
                        <td>{g.goalsAgainst}</td>
                        <td>{g.tracksShots ? g.saves : '—'}</td>
                        <td>{savePercent(g)}</td>
                        <td>{g.shutouts}</td>
                        <td>{toMinutes(g.goalieSeconds)}</td>
                        {/* Согласие — тем же значком, что у игроков на странице команды.
                            Нет или истекло — в подсказке кнопка «Заполнить»: вратарь
                            подписывает его сам. Справку и полис загружает лига */}
                        {showConsent && (
                          <td className="reserve-goalies__doc-cell">
                            {g.consent && (
                              <DocumentBadge
                                doc={{ key: 'consent', ...g.consent }}
                                label="Согласие на обработку данных"
                                action={!isDocumentValid(g.consent) ? (
                                  <button
                                    type="button"
                                    className="team-roster__tip-action"
                                    onClick={() => setConsentUserId(g.playerId)}
                                  >
                                    Заполнить
                                  </button>
                                ) : null}
                              />
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="admin-modal__buttons">
              <button type="button" className="admin-modal__cancel" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* После подписания перечитываем список: если других документов лига не требует,
          вратарь сразу станет доступен и появится его телефон. Ошибку перечитывания
          глотаем — согласие к этому моменту уже сохранено */}
      {consentUserId !== null && (
        <ConsentFormModal
          apiPath={`/api/consent/reserve/${divisionId}/${consentUserId}`}
          onClose={() => setConsentUserId(null)}
          onSigned={() => loadGoalies().catch(() => {})}
        />
      )}
    </>
  );
}
