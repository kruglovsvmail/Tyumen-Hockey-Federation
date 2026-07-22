import { useState } from 'react';
import { createPortal } from 'react-dom';
import { apiSendJson } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import './Modal.css';

export default function ContactsFormModal({ contacts, onClose, onSaved }) {
  const { token } = useAdmin();
  const [address, setAddress] = useState(contacts?.address || '');
  const [phone, setPhone] = useState(contacts?.phone || '');
  const [email, setEmail] = useState(contacts?.email || '');
  const [vkUrl, setVkUrl] = useState(contacts?.vkUrl || '');
  const [ogrn, setOgrn] = useState(contacts?.ogrn || '');
  const [inn, setInn] = useState(contacts?.inn || '');
  const [legalName, setLegalName] = useState(contacts?.legalName || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiSendJson(
        '/api/contacts',
        'PUT',
        {
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          vkUrl: vkUrl.trim(),
          ogrn: ogrn.trim(),
          inn: inn.trim(),
          legalName: legalName.trim(),
        },
        token
      );
      onSaved(data.contacts);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__title font-display">Контакты федерации</div>
        <form className="admin-modal__form" onSubmit={handleSubmit}>
          <textarea
            className="admin-modal__input"
            placeholder="Адрес (можно в 2 строки)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
          />
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="url"
            placeholder="Ссылка ВКонтакте"
            value={vkUrl}
            onChange={(e) => setVkUrl(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="text"
            placeholder="ОГРН"
            value={ogrn}
            onChange={(e) => setOgrn(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="text"
            placeholder="ИНН"
            value={inn}
            onChange={(e) => setInn(e.target.value)}
          />
          <input
            className="admin-modal__input"
            type="text"
            placeholder="Юридическое название"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
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
