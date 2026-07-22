import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import PageHeading from '../components/PageHeading.jsx';
import Loader from '../components/Loader.jsx';
import PlaceholderSection from '../components/PlaceholderSection.jsx';
import VideoCard from '../components/VideoCard.jsx';
import VideoFormModal from '../components/VideoFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import './VideoPage.css';

export default function VideoPage({ title }) {
  const { isAdmin, token } = useAdmin();
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingVideo, setEditingVideo] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingVideo, setDeletingVideo] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const loadVideos = (targetPage) => {
    setLoading(true);
    apiGet(`/api/videos?page=${targetPage}`)
      .then((data) => {
        setVideos(data.videos);
        setTotalPages(data.totalPages);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadVideos(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSaved = () => {
    const wasCreate = !editingVideo?.id;
    setEditingVideo(null);
    // Новое видео всегда попадает на первую страницу (сортировка по дате добавления) —
    // перескакиваем туда, чтобы админ сразу увидел результат.
    if (wasCreate && page !== 1) {
      setPage(1);
    } else {
      loadVideos(page);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/videos/${deletingVideo.id}`, token);
      setDeletingVideo(null);
      loadVideos(page);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="page-container">
      <PageHeading title={title} />

      {error && <PlaceholderSection>Не удалось загрузить видео: {error}</PlaceholderSection>}
      {!error && loading && <Loader />}

      {!error && !loading && (
        <>
          {videos.length === 0 && !isAdmin && <PlaceholderSection>Видео пока не добавлены.</PlaceholderSection>}

          {(videos.length > 0 || isAdmin) && (
            <div className="videos-grid">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  editable={isAdmin}
                  onEdit={() => setEditingVideo(video)}
                  onDelete={() => setDeletingVideo(video)}
                />
              ))}
              {isAdmin && (
                <button type="button" className="video-add-card" onClick={() => setEditingVideo({})}>
                  + ДОБАВИТЬ
                </button>
              )}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {editingVideo && (
        <VideoFormModal
          video={editingVideo.id ? editingVideo : null}
          onClose={() => setEditingVideo(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingVideo && (
        <ConfirmDialog
          title="Удалить видео?"
          message={`«${deletingVideo.title}» будет удалено без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingVideo(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
