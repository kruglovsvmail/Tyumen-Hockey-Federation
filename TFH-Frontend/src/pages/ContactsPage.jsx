import { useEffect, useState } from 'react';
import { apiGet } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import ContactsFormModal from '../components/ContactsFormModal.jsx';
import './ContactsPage.css';

export default function ContactsPage({ title }) {
  const { isAdmin } = useAdmin();
  const [contacts, setContacts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    apiGet('/api/contacts')
      .then((data) => setContacts(data.contacts))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const addressLines = contacts?.address ? contacts.address.split('\n') : [];
  const hasRequisites = Boolean(contacts?.ogrn || contacts?.inn || contacts?.legalName);

  return (
    <div className="page-container">
      <PageHeading title={title} />

      {error && <PlaceholderSection>Не удалось загрузить данные: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && !contacts && !isAdmin && <PlaceholderSection>Контакты пока не заполнены.</PlaceholderSection>}

      {!error && !loading && (contacts || isAdmin) && (
        <div className="glass-card contacts-card">
          {isAdmin && (
            <button
              type="button"
              className="contacts-card__edit"
              onClick={() => setEditing(true)}
              aria-label="Редактировать"
            >
              ✎
            </button>
          )}

          {contacts?.address && (
            <div className="contacts-block">
              <div className="contacts-label">Адрес</div>
              <div className="contacts-value">
                {addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          )}

          {contacts?.phone && (
            <div className="contacts-block">
              <div className="contacts-label">Телефон</div>
              <a className="contacts-value contacts-link" href={`tel:${contacts.phone.replace(/\s/g, '')}`}>
                {contacts.phone}
              </a>
            </div>
          )}

          {contacts?.email && (
            <div className="contacts-block">
              <div className="contacts-label">Email</div>
              <a className="contacts-value contacts-link" href={`mailto:${contacts.email}`}>
                {contacts.email}
              </a>
            </div>
          )}

          {contacts?.vkUrl && (
            <div className="contacts-block">
              <div className="contacts-label">Соцсети</div>
              <a
                className="contacts-value contacts-link contacts-link--vk"
                href={contacts.vkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                ВКонтакте
              </a>
            </div>
          )}

          {hasRequisites && (
            <div className="contacts-block">
              <div className="contacts-label">Реквизиты</div>
              <div className="contacts-value">
                {contacts.ogrn && <>ОГРН {contacts.ogrn}</>}
                {contacts.ogrn && contacts.inn && ' · '}
                {contacts.inn && <>ИНН {contacts.inn}</>}
                {(contacts.ogrn || contacts.inn) && contacts.legalName && <br />}
                {contacts.legalName}
              </div>
            </div>
          )}

          {isAdmin && !contacts?.address && !contacts?.phone && !contacts?.email && !contacts?.vkUrl && !hasRequisites && (
            <div className="contacts-block">
              <div className="contacts-value">Контакты ещё не заполнены — нажмите ✎, чтобы добавить.</div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <ContactsFormModal
          contacts={contacts}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setContacts(updated);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
