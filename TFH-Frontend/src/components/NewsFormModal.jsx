import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';
import './NewsFormModal.css';

export default function NewsFormModal({ item, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(item);
  const [title, setTitle] = useState(item?.title || '');
  const [body, setBody] = useState(item?.body || '');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(item?.imageUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Заполните заголовок и текст новости');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('body', body.trim());
      if (imageFile) formData.append('image', imageFile);

      const path = isEdit ? `/api/news/${item.id}` : '/api/news';
      const data = await apiUpload(path, formData, token, isEdit ? 'PUT' : 'POST');
      onSaved(data.item);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal admin-modal--wide news-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">{isEdit ? 'Редактировать новость' : 'Новая новость'}</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <label className="news-form-modal__image-label">
            {preview ? (
              <img src={preview} alt="" className="news-form-modal__preview" />
            ) : (
              <div className="news-form-modal__preview news-form-modal__preview--empty">Изображение (необязательно)</div>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} hidden />
            <span className="news-form-modal__image-hint">
              {preview ? 'Изменить изображение' : 'Загрузить изображение'}
            </span>
          </label>

          <input
            className="admin-modal__input"
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="admin-modal__input admin-modal__textarea-large"
            placeholder="Текст новости"
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
