// Единый источник структуры меню — используется в шапке, на хиро-блоке главной,
// в футере и для генерации маршрутов в App.jsx, чтобы всё не расходилось в разных местах.
// Пункты выпадающих меню — это сразу конечные страницы, отдельной "родительской"
// страницы у раздела нет (сам заголовок раздела в шапке — не ссылка, только триггер меню).
export const NAV = [
  {
    key: 'fed',
    label: 'О федерации',
    items: [
      { label: 'Организация', to: '/organizatsiya' },
      { label: 'Руководство', to: '/rukovodstvo' },
      { label: 'Контакты', to: '/kontakty' },
    ],
  },
  {
    key: 'champ',
    label: 'Чемпионат',
    items: [
      {
        label: 'Дивизионы «Мастер»',
        to: '/divizion-master',
        pageTitle: 'ЧЕМПИОНАТ ПО ХОККЕЮ С ШАЙБОЙ СРЕДИ КОМАНД БЕЗ ОГРАНИЧЕНИЯ МАСТЕРСТВА ПО ХОККЕЙНОЙ ПОДГОТОВКЕ СТАРШЕ ВОСЕМНАДЦАТИ ЛЕТ',
        // group — какие divisions.classification из общей БД показывать (см. TFH-Backend/controllers/ChampionshipController.js)
        group: 'master',
      },
      {
        label: 'Дивизионы «Любитель»',
        to: '/divizion-lubitel',
        pageTitle: 'ХОККЕЮ С ШАЙБОЙ СРЕДИ ЛЮБИТЕЛЬСКИХ КОМАНД СТАРШЕ ВОСЕМНАДЦАТИ ЛЕТ',
        group: 'lubitel',
      },
      {
        label: 'Дивизионы «VIP»',
        to: '/divizion-vip',
        pageTitle: 'ГОРОДСКОЙ ЧЕМПИОНАТ ПО ХОККЕЮ С ШАЙБОЙ СРЕДИ VIP КОМАНД СТАРШЕ ВОСЕМНАДЦАТИ ЛЕТ',
        group: 'vip',
      },
    ],
  },
  {
    key: 'media',
    label: 'Медиа',
    items: [
      { label: 'Фото', to: '/foto' },
      { label: 'Видео', to: '/video' },
      { label: 'Трансляции', to: '/translyacii' },
    ],
  },
  {
    key: 'partners',
    label: 'Сотрудничество',
    to: '/sotrudnichestvo',
  },
];

// zone нужен фоновой 3D-сцене — по нему выбирается угол/масштаб "облёта камеры"
export const zoneForPath = (pathname) => {
  for (const section of NAV) {
    const paths = section.items ? section.items.map((item) => item.to) : [section.to];
    if (paths.includes(pathname)) return section.key;
  }
  return 'home';
};
