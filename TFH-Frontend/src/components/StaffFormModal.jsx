import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiUpload } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';
import './StaffFormModal.css';

export default function StaffFormModal({ staff, onClose, onSaved }) {
  const { token } = useAdmin();
  const isEdit = Boolean(staff);
  const [fullName, setFullName] = useState(staff?.fullName || '');
  const [position, setPosition] = useState(staff?.position || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(staff?.photoUrl || null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !position.trim()) {
      setError('Заполните ФИО и должность');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('position', position.trim());
      if (photoFile) formData.append('photo', photoFile);

      const path = isEdit ? `/api/staff/${staff.id}` : '/api/staff';
      const data = await apiUpload(path, formData, token, isEdit ? 'PUT' : 'POST');
      onSaved(data.staff);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal staff-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">
          {isEdit ? 'Редактировать сотрудника' : 'Новый сотрудник'}
        </div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <label className="staff-form-modal__photo-label">
            {preview ? (
              <img src={preview} alt="" className="staff-form-modal__preview" />
            ) : (
              <div className="staff-form-modal__preview staff-form-modal__preview--empty">Фото</div>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} hidden />
            <span className="staff-form-modal__photo-hint">Изменить фото</span>
          </label>

          <input
            className="admin-modal__input"
            type="text"
            placeholder="ФИО"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Должность"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
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
