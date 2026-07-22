import { useNavigate } from 'react-router-dom';

export default function AlbumCard({ album, editable, onEdit, onDelete }) {
  const navigate = useNavigate();

  const openAlbum = () => navigate(`/foto/${album.id}`);

  // Кнопки лежат внутри кликабельной карточки — останавливаем всплытие,
  // чтобы клик по ним не открывал заодно и альбом.
  const withStop = (handler) => (e) => {
    e.stopPropagation();
    handler();
  };

  return (
    <div
      className="album-card"
      onClick={openAlbum}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') openAlbum();
      }}
    >
      {editable && (
        <div className="album-card__actions">
          <button type="button" className="album-card__action" onClick={withStop(onEdit)} aria-label="Редактировать">
            ✎
          </button>
          <button
            type="button"
            className="album-card__action album-card__action--danger"
            onClick={withStop(onDelete)}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      {album.coverUrl ? (
        <img src={album.coverUrl} alt="" className="album-card__cover" />
      ) : (
        <div className="album-card__cover album-card__cover--placeholder" />
      )}

      <div className="album-card__title">{album.title}</div>
      <div className="album-card__count">{album.photoCount} фото</div>
    </div>
  );
}
