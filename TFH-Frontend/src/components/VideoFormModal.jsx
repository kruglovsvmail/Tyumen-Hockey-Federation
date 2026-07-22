import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSendJson } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

export default function VideoFormModal({ video, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(video);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || (!isEdit && !url.trim())) {
      setError('Укажите название и ссылку на видео');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const path = isEdit ? `/api/videos/${video.id}` : '/api/videos';
      const body = {
        title: title.trim(),
        description: description.trim(),
      };
      if (url.trim()) body.url = url.trim();

      const data = await apiSendJson(path, isEdit ? 'PUT' : 'POST', body, token);
      onSaved(data.video);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">{isEdit ? 'Редактировать видео' : 'Новое видео'}</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <input
            className="admin-modal__input"
            type="url"
            placeholder={
              isEdit ? 'Новая ссылка VK / YouTube / RuTube (необязательно)' : 'Ссылка на видео VK, YouTube или RuTube'
            }
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Название"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="admin-modal__input"
            placeholder="Краткое описание (необязательно)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
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
