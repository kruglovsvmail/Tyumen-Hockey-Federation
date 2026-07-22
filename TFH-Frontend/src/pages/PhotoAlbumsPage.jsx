import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import AlbumCard from '../components/AlbumCard.jsx';
import AlbumFormModal from '../components/AlbumFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import './PhotoAlbumsPage.css';

export default function PhotoAlbumsPage({ title }) {
  const { isAdmin, token } = useAdmin();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingAlbum, setEditingAlbum] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingAlbum, setDeletingAlbum] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    apiGet('/api/albums')
      .then((data) => setAlbums(data.albums))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (savedItem) => {
    setAlbums((prev) => {
      const exists = prev.some((a) => a.id === savedItem.id);
      return exists ? prev.map((a) => (a.id === savedItem.id ? savedItem : a)) : [savedItem, ...prev];
    });
    setEditingAlbum(null);
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/albums/${deletingAlbum.id}`, token);
      setAlbums((prev) => prev.filter((a) => a.id !== deletingAlbum.id));
      setDeletingAlbum(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="page-container">
      <PageHeading title={title} />

      {error && <PlaceholderSection>Не удалось загрузить альбомы: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && (
        <>
          {albums.length === 0 && !isAdmin && <PlaceholderSection>Альбомы пока не добавлены.</PlaceholderSection>}

          {(albums.length > 0 || isAdmin) && (
            <div className="albums-grid">
              {albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  editable={isAdmin}
                  onEdit={() => setEditingAlbum(album)}
                  onDelete={() => setDeletingAlbum(album)}
                />
              ))}
              {isAdmin && (
                <button type="button" className="album-add-card" onClick={() => setEditingAlbum({})}>
                  + ДОБАВИТЬ
                </button>
              )}
            </div>
          )}
        </>
      )}

      {editingAlbum && (
        <AlbumFormModal
          album={editingAlbum.id ? editingAlbum : null}
          onClose={() => setEditingAlbum(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingAlbum && (
        <ConfirmDialog
          title="Удалить альбом?"
          message={`«${deletingAlbum.title}» и все фото внутри будут удалены без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingAlbum(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
