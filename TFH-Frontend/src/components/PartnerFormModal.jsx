import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';
import './PartnerFormModal.css';

export default function PartnerFormModal({ partner, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(partner);
  const [name, setName] = useState(partner?.name || '');
  const [description, setDescription] = useState(partner?.description || '');
  const [linkUrl, setLinkUrl] = useState(partner?.linkUrl || '');
  const [logoFile, setLogoFile] = useState(null);
  const [preview, setPreview] = useState(partner?.logoUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Укажите название партнёра');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      formData.append('linkUrl', linkUrl.trim());
      if (logoFile) formData.append('logo', logoFile);

      const path = isEdit ? `/api/partners/${partner.id}` : '/api/partners';
      const data = await apiUpload(path, formData, token, isEdit ? 'PUT' : 'POST');
      onSaved(data.partner);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal partner-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">
          {isEdit ? 'Редактировать партнёра' : 'Новый партнёр'}
        </div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <label className="partner-form-modal__logo-label">
            {preview ? (
              <img src={preview} alt="" className="partner-form-modal__preview" />
            ) : (
              <div className="partner-form-modal__preview partner-form-modal__preview--empty">Лого</div>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} hidden />
            <span className="partner-form-modal__logo-hint">Изменить логотип</span>
          </label>

          <input
            className="admin-modal__input"
            type="text"
            placeholder="Название партнёра"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="admin-modal__input partner-form-modal__textarea"
            placeholder="Краткое описание"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <input
            className="admin-modal__input"
            type="url"
            placeholder="Ссылка на сайт партнёра (необязательно)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
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
