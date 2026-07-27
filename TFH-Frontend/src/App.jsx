import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext.jsx';
import Layout from './layout/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import SimplePage from './pages/SimplePage.jsx';
import DivisionsPage from './pages/DivisionsPage.jsx';
import DivisionDetailPage from './pages/DivisionDetailPage.jsx';
import TeamDetailPage from './pages/TeamDetailPage.jsx';
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
                element = <DivisionsPage title={title} group={page.group} basePath={page.to} />;
              } else if (CUSTOM_PAGES[page.to]) {
                const CustomPage = CUSTOM_PAGES[page.to];
                element = <CustomPage title={title} basePath={page.to} />;
              } else {
                element = <SimplePage title={title} />;
              }
              return <Route key={page.to} path={page.to.slice(1)} element={element} />;
            })}
            {/* Не пункт меню — открывается кликом по карточке дивизиона/турнира на страницах
                "Чемпионата" и "Турниров" (DivisionCard). Один и тот же компонент для обеих,
                т.к. в БД это одна сущность (divisions.is_tournament) — различается только
                тем, куда ведёт хлебная крошка "‹ Назад". */}
            {FLAT_PAGES.filter((page) => page.group).map((page) => (
              <Route
                key={`${page.to}-detail`}
                path={`${page.to.slice(1)}/:id`}
                element={<DivisionDetailPage backTo={page.to} backLabel={page.label} />}
              />
            ))}
            <Route
              path="turniry/:id"
              element={<DivisionDetailPage backTo="/turniry" backLabel="Турниры" />}
            />
            {/* Страница команды — открывается со вкладок "Таблица"/"Команды" страницы дивизиона */}
            {FLAT_PAGES.filter((page) => page.group).map((page) => (
              <Route
                key={`${page.to}-team`}
                path={`${page.to.slice(1)}/:id/komanda/:teamId`}
                element={<TeamDetailPage backTo={page.to} backLabel={page.label} />}
              />
            ))}
            <Route
              path="turniry/:id/komanda/:teamId"
              element={<TeamDetailPage backTo="/turniry" backLabel="Турниры" />}
            />
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
