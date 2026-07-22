import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSendJson } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';
import './StatsFormModal.css';

// Ровно 5 фиксированных блоков — не список, добавить/удалить нельзя, только поменять значения
export default function StatsFormModal({ stats, descriptionTitle, descriptionBody, onClose, onSaved }) {
  const { token } = useAdmin();
  const [values, setValues] = useState(stats.map((s) => ({ value: s.value || '', label: s.label || '' })));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (index, field, val) => {
    setValues((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: val } : s)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiSendJson(
        '/api/organization',
        'PUT',
        {
          descriptionTitle,
          descriptionBody,
          stats: values.map((s) => ({ value: s.value.trim(), label: s.label.trim() })),
        },
        token
      );
      onSaved(data.organization);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Цифровые блоки</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          {values.map((stat, index) => (
            <div key={index} className="stats-form-modal__row">
              <input
                className="admin-modal__input stats-form-modal__value"
                type="text"
                placeholder="Значение"
                value={stat.value}
                onChange={(e) => updateField(index, 'value', e.target.value)}
              />
              <input
                className="admin-modal__input stats-form-modal__label"
                type="text"
                placeholder="Подпись"
                value={stat.label}
                onChange={(e) => updateField(index, 'label', e.target.value)}
              />
            </div>
          ))}

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
