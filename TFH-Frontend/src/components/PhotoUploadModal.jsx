import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

export default function PhotoUploadModal({ albumId, onClose, onUploaded }) {
  const { token } = useAdmin();
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleFilesChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Выберите хотя бы один файл');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));

      const data = await apiUpload(`/api/albums/${albumId}/photos`, formData, token, 'POST');
      onUploaded(data.photos);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Добавить фото</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <label className="admin-modal__file-label">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleFilesChange}
              hidden
            />
            <span>{files.length > 0 ? `Выбрано файлов: ${files.length}` : 'Выбрать файлы (можно несколько)'}</span>
          </label>

          {error && <div className="admin-modal__error">{error}</div>}

          <div className="admin-modal__buttons">
            <button type="button" className="admin-modal__cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="admin-modal__submit" disabled={submitting}>
              {submitting ? 'Загружаем…' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
