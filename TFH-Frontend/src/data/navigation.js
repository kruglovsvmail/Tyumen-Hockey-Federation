// Единый источник структуры меню — используется в шапке, на хиро-блоке главной,
// в футере и для генерации маршрутов в App.jsx, чтобы всё не расходилось в разных местах.
// Пункты выпадающих меню — это сразу конечные страницы, отдельной "родительской"
// страницы у раздела нет (сам заголовок раздела в шапке — не ссылка, только триггер меню).
export const NAV = [
  {
    key: 'fed',
    label: 'Федерация',
    items: [
      { label: 'Организация', to: '/organizatsiya', zoneKey: 'organizatsiya' },
      { label: 'Руководство', to: '/rukovodstvo', zoneKey: 'rukovodstvo' },
      { label: 'Контакты', to: '/kontakty', zoneKey: 'kontakty' },
    ],
  },
  {
    key: 'champ',
    label: 'Чемпионат',
    items: [
      {
        label: 'Дивизионы «Мастер»',
        to: '/divizion-master',
        pageTitle: 'ГОРОДСКОЙ ЧЕМПИОНАТ ПО ХОККЕЮ С ШАЙБОЙ СРЕДИ КОМАНД БЕЗ ОГРАНИЧЕНИЯ МАСТЕРСТВА ПО ХОККЕЙНОЙ ПОДГОТОВКЕ СТАРШЕ ВОСЕМНАДЦАТИ ЛЕТ',
        // group — какие divisions.classification из общей БД показывать (см. TFH-Backend/controllers/ChampionshipController.js)
        group: 'master',
      },
      {
        label: 'Дивизионы «Любитель»',
        to: '/divizion-lubitel',
        pageTitle: 'ГОРОДСКОЙ ЧЕМПИОНАТ ПО ХОККЕЮ С ШАЙБОЙ СРЕДИ ЛЮБИТЕЛЬСКИХ КОМАНД СТАРШЕ ВОСЕМНАДЦАТИ ЛЕТ',
        group: 'lubitel',
      },
      {
        label: 'Дивизионы «VIP»',
        to: '/divizion-vip',
        pageTitle: 'ГОРОДСКОЙ ЧЕМПИОНАТ ПО ХОККЕЮ С ШАЙБОЙ СРЕДИ VIP КОМАНД СТАРШЕ ТРИДЦАТИ ПЯТИ ЛЕТ',
        group: 'vip',
      },
    ],
  },
  {
    key: 'media',
    label: 'Медиа',
    items: [
      { label: 'Фото', to: '/foto', zoneKey: 'foto' },
      { label: 'Видео', to: '/video', zoneKey: 'video' },
      { label: 'Трансляции', to: '/translyacii', zoneKey: 'translyacii' },
    ],
  },
  {
    key: 'partners',
    label: 'Сотрудничество',
    to: '/sotrudnichestvo',
  },
];

// zone нужен фоновой 3D-сцене — по нему выбирается угол/масштаб "облёта камеры".
// Составной ключ "<section.key>-<zoneKey>" даёт каждой вкладке свой ракурс (см. Background3D.jsx).
// ВАЖНО: тут нарочно используется zoneKey, а не group — group уже занято в App.jsx
// (наличие group у пункта меню переключает страницу на DivisionsPage с реальным API-запросом
// к чемпионату; путать эти два поля нельзя, иначе роутинг у Федерации/Медиа сломается).
export const zoneForPath = (pathname) => {
  for (const section of NAV) {
    if (!section.items) {
      if (section.to === pathname) return section.key;
      continue;
    }
    const match = section.items.find((item) => item.to === pathname);
    if (!match) continue;
    const suffix = match.group || match.zoneKey;
    return suffix ? `${section.key}-${suffix}` : section.key;
  }
  return 'home';
};
