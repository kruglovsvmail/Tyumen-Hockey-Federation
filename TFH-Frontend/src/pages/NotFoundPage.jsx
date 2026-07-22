import { NavLink } from 'react-router-dom';
import PageHeading from '../components/PageHeading.jsx';

export default function NotFoundPage() {
  return (
    <div className="page-container">
      <PageHeading title="Страница не найдена" />
      <div className="glass-card placeholder-card">
        <p>
          Такой страницы нет. <NavLink to="/">Вернуться на главную</NavLink>.
        </p>
      </div>
    </div>
  );
}
