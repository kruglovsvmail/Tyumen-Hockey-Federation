import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSendJson } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

export default function DescriptionFormModal({ descriptionTitle, descriptionBody, stats, onClose, onSaved }) {
  const { token } = useAdmin();
  const [title, setTitle] = useState(descriptionTitle || '');
  const [body, setBody] = useState(descriptionBody || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiSendJson(
        '/api/organization',
        'PUT',
        {
          descriptionTitle: title.trim(),
          descriptionBody: body.trim(),
          stats,
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
        <div className="admin-modal__title font-display">Описание федерации</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="admin-modal__input admin-modal__textarea-large"
            placeholder="Текст описания (пустая строка — разделение на абзацы)"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

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
