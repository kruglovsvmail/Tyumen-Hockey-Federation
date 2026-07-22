import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import PhotoUploadModal from '../components/PhotoUploadModal.jsx';
import PhotoLightbox from '../components/PhotoLightbox.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import './AlbumDetailPage.css';

export default function AlbumDetailPage() {
  const { albumId } = useParams();
  const { isAdmin, token } = useAdmin();

  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showUpload, setShowUpload] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/albums/${albumId}/photos`)
      .then((data) => {
        setAlbum(data.album);
        setPhotos(data.photos);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [albumId]);

  const handleUploaded = (newPhotos) => {
    setPhotos((prev) => [...prev, ...newPhotos]);
    setShowUpload(false);
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/albums/${albumId}/photos/${deletingPhoto.id}`, token);
      setPhotos((prev) => prev.filter((p) => p.id !== deletingPhoto.id));
      setDeletingPhoto(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="page-container">
      <Link to="/foto" className="album-detail__back">
        ‹ Все альбомы
      </Link>

      {error && <PlaceholderSection>Не удалось загрузить альбом: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && album && (
        <>
          <div className="album-detail__header">
            <PageHeading title={album.title} />
            {isAdmin && (
              <button type="button" className="album-detail__upload" onClick={() => setShowUpload(true)}>
                + Добавить фото
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <PlaceholderSection>В этом альбоме пока нет фото.</PlaceholderSection>
          ) : (
            <div className="gallery-grid">
              {photos.map((photo, index) => (
                <div key={photo.id} className="gallery-thumb">
                  <button
                    type="button"
                    className="gallery-thumb__open"
                    onClick={() => setLightboxIndex(index)}
                    aria-label="Открыть фото"
                  >
                    <img src={photo.url} alt="" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="gallery-thumb__delete"
                      onClick={() => setDeletingPhoto(photo)}
                      aria-label="Удалить фото"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showUpload && (
        <PhotoUploadModal albumId={albumId} onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          title={album?.title}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      {deletingPhoto && (
        <ConfirmDialog
          title="Удалить фото?"
          message={`Фото будет удалено без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingPhoto(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
