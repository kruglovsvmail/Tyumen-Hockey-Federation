import { Outlet, useLocation } from 'react-router-dom';
import Background from './Background.jsx';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import { zoneForPath } from '../data/navigation.js';
import './Layout.css';

export default function Layout() {
  const { pathname } = useLocation();
  const zone = zoneForPath(pathname);
  const isHome = pathname === '/';

  return (
    <div className="app-shell">
      <Background zone={zone} />
      <Header visible={!isHome} />
      <div className="app-shell__content">
        <main className={`app-shell__main${isHome ? ' app-shell__main--home' : ''}`}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
