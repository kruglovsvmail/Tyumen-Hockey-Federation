import { useState } from 'react';
import { useClampOverflow } from '../hooks/useClampOverflow.js';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

export default function NewsItem({ item, editable, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const { ref: bodyRef, isTruncated } = useClampOverflow(item.body, expanded);

  return (
    <div className={`news-item${editable ? ' news-item--editable' : ''}`}>
      {editable && (
        <div className="news-item__actions">
          <button type="button" className="news-item__action" onClick={onEdit} aria-label="Редактировать">
            ✎
          </button>
          <button
            type="button"
            className="news-item__action news-item__action--danger"
            onClick={onDelete}
            aria-label="Удалить"
          >
            ✕
          </button>
        </div>
      )}

      <div className="news-item__row">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="news-item__image" />
        ) : (
          <div className="news-item__image news-item__image--placeholder" />
        )}

        <div className="news-item__content">
          <div className="news-item__date">{dateFormatter.format(new Date(item.createdAt))}</div>
          <div className="news-item__title">{item.title}</div>
          <div ref={bodyRef} className={`news-item__body${!expanded ? ' news-item__body--clamped' : ''}`}>
            {item.body}
          </div>
          {isTruncated && (
            <button type="button" className="news-item__toggle" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Свернуть' : 'Читать полностью'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
