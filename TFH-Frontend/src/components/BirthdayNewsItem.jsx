const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

// Визуально оформлена как обычная новость (см. NewsItem.jsx), но не хранится в БД —
// это виртуальный блок, который NewsPanel.jsx подставляет первым в ленту, если сегодня
// у кого-то из игроков/сотрудников лиги день рождения (см. BirthdaysController.js).
export default function BirthdayNewsItem({ date, greeting, users }) {
  return (
    <div className="news-item news-item--birthday">
      <div className="news-item__row">
        <img src="/image/birthday-cake.jpg" alt="" className="news-item__image" />

        <div className="news-item__content">
          <div className="news-item__date">{dateFormatter.format(new Date(date))}</div>
          <div className="news-item__title">С ДНЁМ РОЖДЕНИЯ!</div>
          <div className="news-item__body">{greeting}</div>
          <ul className="news-item__birthday-list">
            {users.map((u) => (
              <li key={u.fullName}>{u.fullName}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
