import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

// Пропс называем doc, а не document — иначе он затенил бы глобальный window.document,
// который нужен ниже для createPortal.
export default function ApplicationDocumentFormModal({ doc, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(doc);
  const [title, setTitle] = useState(doc?.title || '');
  const [sampleImage, setSampleImage] = useState(null);
  const [formFile, setFormFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Укажите заголовок');
      return;
    }
    if (!isEdit && !sampleImage) {
      setError('Прикрепите фото заполненного образца');
      return;
    }
    if (!isEdit && !formFile) {
      setError('Прикрепите файл бланка (PDF)');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      if (sampleImage) formData.append('sampleImage', sampleImage);
      if (formFile) formData.append('formFile', formFile);

      const path = isEdit ? `/api/application-documents/${doc.id}` : '/api/application-documents';
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
        <div className="admin-modal__title font-display">{isEdit ? 'Редактировать блок' : 'Новый блок документации'}</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Заголовок"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="admin-modal__file-label">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => e.target.files[0] && setSampleImage(e.target.files[0])}
              hidden
            />
            <span>
              {sampleImage ? sampleImage.name : isEdit ? 'Заменить фото образца' : 'Прикрепить фото заполненного образца'}
            </span>
          </label>

          <label className="admin-modal__file-label">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => e.target.files[0] && setFormFile(e.target.files[0])}
              hidden
            />
            <span>
              {formFile ? formFile.name : isEdit ? 'Заменить бланк (PDF)' : 'Прикрепить бланк для скачивания (PDF)'}
            </span>
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
