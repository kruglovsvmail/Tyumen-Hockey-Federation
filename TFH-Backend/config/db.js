import 'dotenv/config';
import pg from 'pg';

// Общие настройки стабильности сети (см. Team-Room/TR-Backend/config/db.js —
// без idleTimeoutMillis простаивающие соединения рвёт файрвол, а не пул)
const poolOptions = {
  keepAlive: true,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  max: 20,
};

// Собственная БД ТФХ (новости, страницы, контент сайта, админка)
export const tfhPool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...poolOptions,
});

// Общая БД LMS + Team Room (турниры, команды, матчи — витринные данные для сайта федерации)
export const sharedPool = new pg.Pool({
  host: process.env.SHARED_DB_HOST,
  port: process.env.SHARED_DB_PORT,
  user: process.env.SHARED_DB_USER,
  password: process.env.SHARED_DB_PASSWORD,
  database: process.env.SHARED_DB_NAME,
  ...poolOptions,
});

const attachErrorLogger = (pool, label) => {
  pool.on('error', (err) => {
    console.error(`⚠️ Ошибка на простаивающем клиенте БД (${label}):`, err.message);
  });
};

attachErrorLogger(tfhPool, 'tfh');
attachErrorLogger(sharedPool, 'shared');

export default tfhPool;
