import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../api/client.js';
import { useAdmin } from '../context/AdminContext.jsx';
import Loader from './Loader.jsx';
import NewsItem from './NewsItem.jsx';
import NewsFormModal from './NewsFormModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import './NewsPanel.css';

const FEED_LIMIT = 5;

export default function NewsPanel() {
  const { isAdmin, token } = useAdmin();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingItem, setEditingItem] = useState(null); // null — закрыто, {} — создание, {...} — редактирование
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    apiGet('/api/news')
      .then((data) => setNews(data.news))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaved = (savedItem) => {
    setNews((prev) => {
      const exists = prev.some((n) => n.id === savedItem.id);
      const next = exists ? prev.map((n) => (n.id === savedItem.id ? savedItem : n)) : [savedItem, ...prev];
      // держим ленту отсортированной и не длиннее 5 пунктов — так же, как отдаёт бэкенд
      return next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, FEED_LIMIT);
    });
    setEditingItem(null);
  };

  const handleConfirmDelete = async () => {
    try {
      await apiDelete(`/api/news/${deletingItem.id}`, token);
      setNews((prev) => prev.filter((n) => n.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (err) {
      setDeleteError(err.message);
    }
  };

  return (
    <div className="glass-card news-panel">
      <div className="news-panel__header">
        <div className="news-panel__title font-display">Лента новостей</div>
        {isAdmin && (
          <button type="button" className="news-panel__add" onClick={() => setEditingItem({})}>
            + Добавить новость
          </button>
        )}
      </div>

      {error && <p className="news-panel__message">Не удалось загрузить новости: {error}</p>}
      {!error && loading && <Loader />}
      {!error && !loading && news.length === 0 && <p className="news-panel__message">Пока новостей нет.</p>}

      {!error && !loading && news.length > 0 && (
        <div className="news-panel__list">
          {news.map((item) => (
            <NewsItem
              key={item.id}
              item={item}
              editable={isAdmin}
              onEdit={() => setEditingItem(item)}
              onDelete={() => setDeletingItem(item)}
            />
          ))}
        </div>
      )}

      {editingItem && (
        <NewsFormModal
          item={editingItem.id ? editingItem : null}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          title="Удалить новость?"
          message={`«${deletingItem.title}» будет удалена без возможности восстановления.${
            deleteError ? ` Ошибка: ${deleteError}` : ''
          }`}
          confirmLabel="Удалить"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setDeletingItem(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
}
