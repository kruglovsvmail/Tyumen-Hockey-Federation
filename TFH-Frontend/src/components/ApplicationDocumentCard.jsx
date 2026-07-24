export default function ApplicationDocumentCard({ doc, editable, onEdit, onDelete, onView }) {
  const withStop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div className="app-doc-card">
      {editable && (
        <div className="app-doc-card__actions">
          <button
            type="button"
            className="app-doc-card__action"
            onClick={withStop(onEdit)}
            aria-label="Редактировать"
          >
            ✎
          </button>
          <button
            type="button"
            className="app-doc-card__action app-doc-card__action--danger"
            onClick={withStop(onDelete)}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      <button type="button" className="app-doc-card__preview" onClick={onView} aria-label="Открыть образец для просмотра">
        <img src={doc.sampleImageUrl} alt={doc.title} className="app-doc-card__image" />
      </button>

      <div className="app-doc-card__title">{doc.title}</div>

      <a
        className="app-doc-card__download"
        href={doc.formFileUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        onClick={(e) => e.stopPropagation()}
      >
        Скачать бланк
      </a>
    </div>
  );
}
