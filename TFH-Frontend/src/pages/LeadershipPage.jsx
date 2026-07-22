import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import StaffCard from '../components/StaffCard.jsx';
import StaffFormModal from '../components/StaffFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import './LeadershipPage.css';

export default function LeadershipPage({ title }) {
  const { isAdmin, token } = useAdmin();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingStaff, setEditingStaff] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingStaff, setDeletingStaff] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    apiGet('/api/staff')
      .then((data) => setStaff(data.staff))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (savedItem) => {
    setStaff((prev) => {
      const exists = prev.some((s) => s.id === savedItem.id);
      return exists ? prev.map((s) => (s.id === savedItem.id ? savedItem : s)) : [...prev, savedItem];
    });
    setEditingStaff(null);
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/staff/${deletingStaff.id}`, token);
      setStaff((prev) => prev.filter((s) => s.id !== deletingStaff.id));
      setDeletingStaff(null);
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
          {staff.length === 0 && !isAdmin && <PlaceholderSection>Раздел пока пуст.</PlaceholderSection>}

          {(staff.length > 0 || isAdmin) && (
            <div className="staff-grid">
              {staff.map((member) => (
                <StaffCard
                  key={member.id}
                  staff={member}
                  editable={isAdmin}
                  onEdit={() => setEditingStaff(member)}
                  onDelete={() => setDeletingStaff(member)}
                />
              ))}
              {isAdmin && (
                <button type="button" className="staff-add-card" onClick={() => setEditingStaff({})}>
                  + ДОБАВИТЬ
                </button>
              )}
            </div>
          )}
        </>
      )}

      {editingStaff && (
        <StaffFormModal
          staff={editingStaff.id ? editingStaff : null}
          onClose={() => setEditingStaff(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingStaff && (
        <ConfirmDialog
          title="Удалить сотрудника?"
          message={`«${deletingStaff.fullName}» будет удалён без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingStaff(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
