import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../../api/client.js';
import { useAdmin } from '../../context/AdminContext.jsx';
import '../Modal.css';

// Пропс называем regulation, а не document — глобальный window.document нужен
// ниже для createPortal. divisionId — чей это документ: положения заводятся
// внутри страницы дивизиона и к нему же привязаны.
export default function RegulationFormModal({ regulation, divisionId, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(regulation);
  const [title, setTitle] = useState(regulation?.title || '');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите название документа');
      return;
    }
    if (!isEdit && !file) {
      setError('Прикрепите PDF-файл');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('divisionId', divisionId);
      if (file) formData.append('file', file);

      const path = isEdit ? `/api/regulations/${regulation.id}` : '/api/regulations';
      const data = await apiUpload(path, formData, token, isEdit ? 'PUT' : 'POST');
      onSaved(data.regulation);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">
          {isEdit ? 'Редактировать положение' : 'Новое положение'}
        </div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Название документа"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Только PDF: документ показывается своим просмотрщиком прямо на сайте,
              и другие форматы он отрисовать не сможет */}
          <label className="admin-modal__file-label">
            <input type="file" accept="application/pdf" onChange={handleFileChange} hidden />
            <span>{file ? file.name : isEdit ? 'Заменить PDF-файл' : 'Прикрепить PDF-файл'}</span>
          </label>

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
