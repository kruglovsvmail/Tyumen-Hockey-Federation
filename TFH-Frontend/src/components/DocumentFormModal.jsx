import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

// Пропс называем doc, а не document — иначе он затенил бы глобальный window.document,
// который нужен ниже для createPortal.
export default function DocumentFormModal({ doc, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(doc);
  const [title, setTitle] = useState(doc?.title || '');
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
      if (file) formData.append('file', file);

      const path = isEdit ? `/api/documents/${doc.id}` : '/api/documents';
      const data = await apiUpload(path, formData, token, isEdit ? 'PUT' : 'POST');
      onSaved(data.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">{isEdit ? 'Редактировать документ' : 'Новый документ'}</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Название документа"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

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
