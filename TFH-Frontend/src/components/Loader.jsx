import './Loader.css';

// Универсальный индикатор загрузки — используем везде на сайте вместо текста "Загрузка..."
export default function Loader() {
  return (
    <div className="loader">
      <div className="loader__ring" role="status" aria-label="Загрузка" />
    </div>
  );
}
