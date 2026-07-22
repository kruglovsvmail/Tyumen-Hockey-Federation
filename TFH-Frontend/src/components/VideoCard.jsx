export default function VideoCard({ video, editable, onEdit, onDelete }) {
  return (
    <div className="video-card">
      {editable && (
        <div className="video-card__toolbar">
          <button type="button" className="video-card__action" onClick={onEdit} aria-label="Редактировать">
            ✎
          </button>
          <button
            type="button"
            className="video-card__action video-card__action--danger"
            onClick={onDelete}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      <div className="video-card__frame">
        <iframe
          src={video.embedUrl}
          title={video.title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          frameBorder="0"
        />
      </div>

      <div className="video-card__title">{video.title}</div>
      {video.description && <div className="video-card__description">{video.description}</div>}
    </div>
  );
}
