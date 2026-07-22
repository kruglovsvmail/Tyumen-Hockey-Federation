export default function PartnerCard({ partner, editable, onEdit, onDelete }) {
  const hasLink = Boolean(partner.linkUrl);

  const openLink = () => {
    if (hasLink) window.open(partner.linkUrl, '_blank', 'noopener,noreferrer');
  };

  // Кнопки лежат внутри кликабельной карточки — останавливаем всплытие,
  // чтобы клик по ним не открывал заодно и ссылку партнёра.
  const withStop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div
      className={`partner-card${hasLink ? ' partner-card--clickable' : ''}`}
      onClick={hasLink ? openLink : undefined}
      role={hasLink ? 'link' : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={
        hasLink
          ? (e) => {
              if (e.key === 'Enter') openLink();
            }
          : undefined
      }
    >
      {editable && (
        <div className="partner-card__actions">
          <button
            type="button"
            className="partner-card__action"
            onClick={withStop(onEdit)}
            aria-label="Редактировать"
          >
            ✎
          </button>
          <button
            type="button"
            className="partner-card__action partner-card__action--danger"
            onClick={withStop(onDelete)}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      {partner.logoUrl ? (
        <img src={partner.logoUrl} alt="" className="partner-card__logo" />
      ) : (
        <div className="partner-card__logo partner-card__logo--placeholder" />
      )}

      <div className="partner-card__name">{partner.name}</div>
      {partner.description && <div className="partner-card__description">{partner.description}</div>}
    </div>
  );
}
