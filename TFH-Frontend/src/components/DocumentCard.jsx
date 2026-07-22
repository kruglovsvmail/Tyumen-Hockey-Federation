export default function DocumentCard({ doc, editable, onEdit, onDelete }) {
  const openFile = () => {
    if (doc.fileUrl) window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
  };

  // Кнопки лежат внутри кликабельной карточки — останавливаем всплытие,
  // чтобы клик по ним не открывал заодно и файл.
  const withStop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div
      className="document-card"
      onClick={openFile}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openFile();
      }}
    >
      {editable && (
        <div className="document-card__actions">
          <button
            type="button"
            className="document-card__action"
            onClick={withStop(onEdit)}
            aria-label="Редактировать"
          >
            ✎
          </button>
          <button
            type="button"
            className="document-card__action document-card__action--danger"
            onClick={withStop(onDelete)}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      <svg className="document-card__icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        {/* Тело листа со сложенным уголком */}
        <path
          d="M11 4h15l11 11v27a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
          fill="var(--inner)"
          stroke="var(--glassbrd2)"
          strokeWidth="1.2"
        />
        <path d="M26 4l11 11h-8a3 3 0 0 1-3-3V4z" fill="var(--divider)" />
        {/* Условные строки текста на листе */}
        <rect x="13" y="19" width="14" height="2.2" rx="1.1" fill="var(--innerbrd)" />
        <rect x="13" y="24" width="18" height="2.2" rx="1.1" fill="var(--innerbrd)" />
        {/* Акцентная плашка с подписью PDF поверх листа */}
        <rect x="6" y="29" width="30" height="14" rx="5" fill="var(--acc)" />
        <text x="21" y="38.8" textAnchor="middle" fontSize="10" fontWeight="800" letterSpacing="0.5" fill="#fff">
          PDF
        </text>
      </svg>

      <div className="document-card__title">{doc.title}</div>
    </div>
  );
}
