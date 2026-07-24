import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext.jsx';
import Layout from './layout/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import SimplePage from './pages/SimplePage.jsx';
import DivisionsPage from './pages/DivisionsPage.jsx';
import ContactsPage from './pages/ContactsPage.jsx';
import LeadershipPage from './pages/LeadershipPage.jsx';
import PartnershipPage from './pages/PartnershipPage.jsx';
import OrganizationPage from './pages/OrganizationPage.jsx';
import ApplicationDocumentsPage from './pages/ApplicationDocumentsPage.jsx';
import TournamentsPage from './pages/TournamentsPage.jsx';
import VideoPage from './pages/VideoPage.jsx';
import PhotoAlbumsPage from './pages/PhotoAlbumsPage.jsx';
import AlbumDetailPage from './pages/AlbumDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { NAV } from './data/navigation.js';

// Конечные страницы разделов — плоским списком, без "родительской" страницы раздела.
// Пункты с полем group ведут на живую страницу с данными (DivisionsPage).
const FLAT_PAGES = NAV.flatMap((section) =>
  section.items ? section.items : [{ label: section.label, to: section.to }]
);

// Страницы с уже готовым реальным контентом (не заглушка SimplePage) — по мере наполнения
// остальных разделов сюда просто добавляются новые пары "путь → компонент".
const CUSTOM_PAGES = {
  '/organizatsiya': OrganizationPage,
  '/kontakty': ContactsPage,
  '/rukovodstvo': LeadershipPage,
  '/sotrudnichestvo': PartnershipPage,
  '/video': VideoPage,
  '/foto': PhotoAlbumsPage,
  '/zayavochnaya-dokumentatsiya': ApplicationDocumentsPage,
  '/turniry': TournamentsPage,
};

function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            {FLAT_PAGES.map((page) => {
              const title = page.pageTitle || page.label;
              let element;
              if (page.group) {
                element = <DivisionsPage title={title} group={page.group} />;
              } else if (CUSTOM_PAGES[page.to]) {
                const CustomPage = CUSTOM_PAGES[page.to];
                element = <CustomPage title={title} />;
              } else {
                element = <SimplePage title={title} />;
              }
              return <Route key={page.to} path={page.to.slice(1)} element={element} />;
            })}
            {/* Не пункт меню — открывается кликом по карточке альбома на /foto */}
            <Route path="foto/:albumId" element={<AlbumDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  );
}

export default App;
