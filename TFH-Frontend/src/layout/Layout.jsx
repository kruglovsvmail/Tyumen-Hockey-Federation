import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Background from './Background3D.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { zoneForPath } from '../data/navigation.js';
import './Layout.css';

export default function Layout() {
  const { pathname } = useLocation();
  const zone = zoneForPath(pathname);
  const isHome = pathname === '/';

  // Своего восстановления прокрутки у роутера нет: без этого с середины длинной
  // страницы попадаешь в середину новой
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <Background zone={zone} />
      <Header visible={!isHome} />
      <div className="app-shell__content">
        {/* key — чтобы на каждом переходе элемент пересоздавался и анимация
            появления проигрывалась заново */}
        <main
          key={pathname}
          className={`app-shell__main${isHome ? ' app-shell__main--home' : ''} page-in`}
        >
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
