import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSendJson } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import RangeSlider from '../RangeSlider.jsx';
import '../Modal.css';

// Те же границы, что проверяет бэкенд (utils/divisionDisplaySettings.js)
const COLUMNS_MIN = 1;
const COLUMNS_MAX = 10;
const LOGO_MIN = 40;
const LOGO_MAX = 300;
const LOGO_STEP = 10;

// Настройка сетки команд: сколько карточек в ряду и размер логотипа. Окно без затемнения
// и прижато к углу (см. Modal.css, --docked): раскладку подбирают на глаз, и сетка должна
// перерисовываться прямо под бегунками. Само значение живёт в TeamsTab (draft) — оно же
// стоит на сетке CSS-переменными, здесь только ручки к нему. На сервер уходит по
// «Сохранить»; закрытие без сохранения возвращает сетку как была (это делает TeamsTab).
export default function TeamsGridSettingsModal({ divisionId, draft, saved, onChange, onClose, onSaved }) {
  const { token } = useAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isDirty = draft.columns !== saved.columns || draft.logoSize !== saved.logoSize;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiSendJson(
        `/api/championship/divisions/${divisionId}/display-settings`,
        'PUT',
        { teamsGridColumns: draft.columns, teamsGridLogoSize: draft.logoSize },
        token
      );
      onSaved({ columns: data.settings.teamsGridColumns, logoSize: data.settings.teamsGridLogoSize });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay admin-modal-overlay--transparent" onClick={onClose}>
      <div className="admin-modal admin-modal--docked" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Сетка команд</div>
        <p className="admin-modal__message">
          Настройка только для этого дивизиона. Сетка меняется сразу — сохраните, когда понравится.
        </p>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <div className="admin-modal__slider-field">
            <div className="admin-modal__slider-row">
              <span className="admin-modal__slider-label">Команд в ряду</span>
              <span className="admin-modal__slider-value">{draft.columns}</span>
            </div>
            <RangeSlider
              min={COLUMNS_MIN}
              max={COLUMNS_MAX}
              value={draft.columns}
              onChange={(value) => onChange({ ...draft, columns: value })}
              aria-label="Команд в ряду"
            />
          </div>

          <div className="admin-modal__slider-field">
            <div className="admin-modal__slider-row">
              <span className="admin-modal__slider-label">Размер логотипа</span>
              <span className="admin-modal__slider-value">{draft.logoSize} px</span>
            </div>
            <RangeSlider
              min={LOGO_MIN}
              max={LOGO_MAX}
              step={LOGO_STEP}
              value={draft.logoSize}
              onChange={(value) => onChange({ ...draft, logoSize: value })}
              aria-label="Размер логотипа"
            />
          </div>

          <p className="admin-modal__hint">
            На узких экранах колонок становится меньше само, а логотип ужимается под карточку.
          </p>

          {error && <div className="admin-modal__error">{error}</div>}

          <div className="admin-modal__buttons">
            <button type="button" className="admin-modal__cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="admin-modal__submit" disabled={!isDirty || submitting}>
              {submitting ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
