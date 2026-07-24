import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import ApplicationDocumentCard from '../components/ApplicationDocumentCard.jsx';
import ApplicationDocumentFormModal from '../components/ApplicationDocumentFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PhotoLightbox from '../components/PhotoLightbox.jsx';
import './ApplicationDocumentsPage.css';

export default function ApplicationDocumentsPage({ title }) {
  const { isAdmin, token } = useAdmin();

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null); // просмотр образца в лайтбоксе

  useEffect(() => {
    apiGet('/api/application-documents')
      .then((data) => setDocuments(data.documents))
      .catch((err) => setDocsError(err.message))
      .finally(() => setDocsLoading(false));
  }, []);

  const handleDocSaved = (savedItem) => {
    setDocuments((prev) => {
      const exists = prev.some((d) => d.id === savedItem.id);
      return exists ? prev.map((d) => (d.id === savedItem.id ? savedItem : d)) : [...prev, savedItem];
    });
    setEditingDoc(null);
  };

  const handleConfirmDeleteDoc = async () => {
    try {
      await apiDelete(`/api/application-documents/${deletingDoc.id}`, token);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="page-container">
      <PageHeading title={title} />

      {docsError && <PlaceholderSection>Не удалось загрузить документы: {docsError}</PlaceholderSection>}
      {!docsError && docsLoading && <Loader />}

      {!docsError && !docsLoading && (
        <>
          {documents.length === 0 && !isAdmin && (
            <PlaceholderSection>Заявочная документация пока не добавлена.</PlaceholderSection>
          )}

          {(documents.length > 0 || isAdmin) && (
            <div className="app-doc-grid">
              {documents.map((doc) => (
                <ApplicationDocumentCard
                  key={doc.id}
                  doc={doc}
                  editable={isAdmin}
                  onEdit={() => setEditingDoc(doc)}
                  onDelete={() => setDeletingDoc(doc)}
                  onView={() => setViewingDoc(doc)}
                />
              ))}
              {isAdmin && (
                <button type="button" className="app-doc-add-card" onClick={() => setEditingDoc({})}>
                  + ДОБАВИТЬ
                </button>
              )}
            </div>
          )}
        </>
      )}

      {editingDoc && (
        <ApplicationDocumentFormModal
          doc={editingDoc.id ? editingDoc : null}
          onClose={() => setEditingDoc(null)}
          onSaved={handleDocSaved}
        />
      )}

      {viewingDoc && (
        <PhotoLightbox
          photos={[{ url: viewingDoc.sampleImageUrl }]}
          index={0}
          title={viewingDoc.title}
          onClose={() => setViewingDoc(null)}
          onIndexChange={() => {}}
        />
      )}

      {deletingDoc && (
        <ConfirmDialog
          title="Удалить блок?"
          message={`«${deletingDoc.title}» будет удалён без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDeleteDoc}
          onCancel={() => {
            setDeletingDoc(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
