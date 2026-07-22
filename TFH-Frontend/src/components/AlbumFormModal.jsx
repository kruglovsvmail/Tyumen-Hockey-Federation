import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';
import './AlbumFormModal.css';

export default function AlbumFormModal({ album, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(album);
  const [title, setTitle] = useState(album?.title || '');
  const [coverFile, setCoverFile] = useState(null);
  const [preview, setPreview] = useState(album?.coverUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите название альбома');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (coverFile) formData.append('cover', coverFile);

      const path = isEdit ? `/api/albums/${album.id}` : '/api/albums';
      const data = await apiUpload(path, formData, token, isEdit ? 'PUT' : 'POST');
      onSaved(data.album);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">{isEdit ? 'Редактировать альбом' : 'Новый альбом'}</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <label className="album-form-modal__cover-label">
            {preview ? (
              <img src={preview} alt="" className="album-form-modal__preview" />
            ) : (
              <div className="album-form-modal__preview album-form-modal__preview--empty">Обложка</div>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverChange} hidden />
            <span className="album-form-modal__cover-hint">
              {preview ? 'Изменить обложку' : 'Загрузить обложку'}
            </span>
          </label>

          <input
            className="admin-modal__input"
            type="text"
            placeholder="Название альбома"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
