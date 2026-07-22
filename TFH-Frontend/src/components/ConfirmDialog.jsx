import { createPortal } from 'react-dom';
import './Modal.css';

export default function ConfirmDialog({ title, message, confirmLabel = 'Подтвердить', onConfirm, onCancel }) {
  return createPortal(
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">{title}</div>
        {message && <p className="admin-modal__message">{message}</p>}
        <div className="admin-modal__buttons">
          <button type="button" className="admin-modal__cancel" onClick={onCancel}>
            Отмена
          </button>
          <button type="button" className="admin-modal__submit admin-modal__submit--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
