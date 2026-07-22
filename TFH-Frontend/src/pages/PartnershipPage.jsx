import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import PartnerCard from '../components/PartnerCard.jsx';
import PartnerFormModal from '../components/PartnerFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import './PartnershipPage.css';

export default function PartnershipPage({ title }) {
  const { isAdmin, token } = useAdmin();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingPartner, setEditingPartner] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingPartner, setDeletingPartner] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    apiGet('/api/partners')
      .then((data) => setPartners(data.partners))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (savedItem) => {
    setPartners((prev) => {
      const exists = prev.some((p) => p.id === savedItem.id);
      return exists ? prev.map((p) => (p.id === savedItem.id ? savedItem : p)) : [...prev, savedItem];
    });
    setEditingPartner(null);
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/partners/${deletingPartner.id}`, token);
      setPartners((prev) => prev.filter((p) => p.id !== deletingPartner.id));
      setDeletingPartner(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="page-container">
      <PageHeading title={title} />

      {error && <PlaceholderSection>Не удалось загрузить данные: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && (
        <>
          {partners.length === 0 && !isAdmin && <PlaceholderSection>Раздел пока пуст.</PlaceholderSection>}

          {(partners.length > 0 || isAdmin) && (
            <div className="partners-grid">
              {partners.map((partner) => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  editable={isAdmin}
                  onEdit={() => setEditingPartner(partner)}
                  onDelete={() => setDeletingPartner(partner)}
                />
              ))}
              {isAdmin && (
                <button type="button" className="partner-add-card" onClick={() => setEditingPartner({})}>
                  + ДОБАВИТЬ
                </button>
              )}
            </div>
          )}
        </>
      )}

      {editingPartner && (
        <PartnerFormModal
          partner={editingPartner.id ? editingPartner : null}
          onClose={() => setEditingPartner(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingPartner && (
        <ConfirmDialog
          title="Удалить партнёра?"
          message={`«${deletingPartner.name}» будет удалён без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingPartner(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
