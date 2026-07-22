export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination__nav"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Предыдущая страница"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pagination__page${p === page ? ' is-active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pagination__nav"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Следующая страница"
      >
        ›
      </button>
    </div>
  );
}
