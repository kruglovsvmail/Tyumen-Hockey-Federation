import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSendJson } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import RangeSlider from '../RangeSlider.jsx';
import '../Modal.css';

// Те же границы, что проверяет бэкенд (utils/divisionDisplaySettings.js)
const TOTAL_MIN = 1;
const TOTAL_MAX = 30;

// Настройка блока «Ближайшие матчи»: сколько матчей показывать и сколько из них
// уже сыгранных. Настройка своя у каждого дивизиона (division_display_settings) —
// об этом сказано прямо в форме, чтобы не ждать, что она подействует на соседние.
export default function MatchesWidgetSettingsModal({ divisionId, settings, onClose, onSaved }) {
  const { token } = useAdmin();
  const [total, setTotal] = useState(settings.total);
  const [past, setPast] = useState(settings.past);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Прошедших не бывает больше, чем всего: сдвинули «всего» ниже — «прошедшие» едут следом
  const handleTotalChange = (value) => {
    setTotal(value);
    setPast((prev) => Math.min(prev, value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiSendJson(
        `/api/championship/divisions/${divisionId}/display-settings`,
        'PUT',
        { matchesWidgetTotal: total, matchesWidgetPast: past },
        token
      );
      onSaved({ total: data.settings.matchesWidgetTotal, past: data.settings.matchesWidgetPast });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Ближайшие матчи</div>
        <p className="admin-modal__message">
          Настройка только для этого дивизиона.
        </p>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <div className="admin-modal__slider-field">
            <div className="admin-modal__slider-row">
              <span className="admin-modal__slider-label">Показывать матчей всего</span>
              <span className="admin-modal__slider-value">{total}</span>
            </div>
            <RangeSlider
              min={TOTAL_MIN}
              max={TOTAL_MAX}
              value={total}
              onChange={handleTotalChange}
              aria-label="Показывать матчей всего"
            />
          </div>

          <div className="admin-modal__slider-field">
            <div className="admin-modal__slider-row">
              <span className="admin-modal__slider-label">Из них прошедших</span>
              <span className="admin-modal__slider-value">{past}</span>
            </div>
            <RangeSlider
              min={0}
              max={total}
              value={past}
              onChange={setPast}
              aria-label="Из них прошедших"
            />
          </div>

          <p className="admin-modal__hint">
            Остальные {total - past} — предстоящие. Если матчей одной группы не хватает
            (начало или конец сезона), остаток добирается из другой, чтобы блок не пустел.
          </p>

          {error && <div className="admin-modal__error">{error}</div>}

          <div className="admin-modal__buttons">
            <button type="button" className="admin-modal__cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="admin-modal__submit" disabled={submitting}>
              {submitting ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
