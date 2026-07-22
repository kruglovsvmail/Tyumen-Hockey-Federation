import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import DocumentCard from '../components/DocumentCard.jsx';
import DocumentFormModal from '../components/DocumentFormModal.jsx';
import StatsFormModal from '../components/StatsFormModal.jsx';
import DescriptionFormModal from '../components/DescriptionFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import './OrganizationPage.css';

export default function OrganizationPage({ title }) {
  const { isAdmin, token } = useAdmin();

  const [organization, setOrganization] = useState(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(null);
  const [editingStats, setEditingStats] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docsError, setDocsError] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    apiGet('/api/organization')
      .then((data) => setOrganization(data.organization))
      .catch((err) => setOrgError(err.message))
      .finally(() => setOrgLoading(false));

    apiGet('/api/documents')
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
      await apiDelete(`/api/documents/${deletingDoc.id}`, token);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setDeletingDoc(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  const stats = organization?.stats || [];
  const paragraphs = organization?.descriptionBody ? organization.descriptionBody.split('\n\n') : [];

  return (
    <div className="page-container">
      <PageHeading title={title} />

      {orgError && <PlaceholderSection>Не удалось загрузить данные: {orgError}</PlaceholderSection>}
      {!orgError && orgLoading && <Loader />}

      {!orgError && !orgLoading && organization && (
        <>
          <div className="org-stats">
            {isAdmin && (
              <button
                type="button"
                className="org-stats__edit"
                onClick={() => setEditingStats(true)}
                aria-label="Редактировать цифры"
              >
                ✎
              </button>
            )}
            {stats.map((stat, index) => (
              <div key={index} className="org-stats__item">
                <div className="org-stats__value font-display">{stat.value}</div>
                <div className="org-stats__label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-card org-description">
            {isAdmin && (
              <button
                type="button"
                className="org-description__edit"
                onClick={() => setEditingDescription(true)}
                aria-label="Редактировать описание"
              >
                ✎
              </button>
            )}
            <div className="org-description__title font-display">{organization.descriptionTitle}</div>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="org-description__paragraph">
                {paragraph}
              </p>
            ))}
          </div>
        </>
      )}

      {docsError && <PlaceholderSection>Не удалось загрузить документы: {docsError}</PlaceholderSection>}
      {!docsError && docsLoading && <Loader />}

      {!docsError && !docsLoading && (
        <>
          {documents.length === 0 && !isAdmin && <PlaceholderSection>Документы пока не добавлены.</PlaceholderSection>}

          {(documents.length > 0 || isAdmin) && (
            <div className="documents-grid">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  editable={isAdmin}
                  onEdit={() => setEditingDoc(doc)}
                  onDelete={() => setDeletingDoc(doc)}
                />
              ))}
              {isAdmin && (
                <button type="button" className="document-add-card" onClick={() => setEditingDoc({})}>
                  + ДОБАВИТЬ
                </button>
              )}
            </div>
          )}
        </>
      )}

      {editingStats && organization && (
        <StatsFormModal
          stats={stats}
          descriptionTitle={organization.descriptionTitle}
          descriptionBody={organization.descriptionBody}
          onClose={() => setEditingStats(false)}
          onSaved={(updated) => {
            setOrganization(updated);
            setEditingStats(false);
          }}
        />
      )}

      {editingDescription && organization && (
        <DescriptionFormModal
          descriptionTitle={organization.descriptionTitle}
          descriptionBody={organization.descriptionBody}
          stats={stats}
          onClose={() => setEditingDescription(false)}
          onSaved={(updated) => {
            setOrganization(updated);
            setEditingDescription(false);
          }}
        />
      )}

      {editingDoc && (
        <DocumentFormModal
          doc={editingDoc.id ? editingDoc : null}
          onClose={() => setEditingDoc(null)}
          onSaved={handleDocSaved}
        />
      )}

      {deletingDoc && (
        <ConfirmDialog
          title="Удалить документ?"
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
