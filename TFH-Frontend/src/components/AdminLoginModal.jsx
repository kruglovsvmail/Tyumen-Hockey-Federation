import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

export default function AdminLoginModal({ onClose }) {
  const { login } = useAdmin();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginValue, password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Вход для администратора</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Логин"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            autoFocus
          />
          <input
            className="admin-modal__input"
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="admin-modal__error">{error}</div>}
          <button type="submit" className="admin-modal__submit" disabled={submitting}>
            {submitting ? 'Входим…' : 'Войти'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
