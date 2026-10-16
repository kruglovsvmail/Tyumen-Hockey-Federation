process.env.TZ = 'UTC';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';

import { tfhPool, sharedPool } from './config/db.js';
import championshipRoutes from './routes/championshipRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import partnersRoutes from './routes/partnersRoutes.js';
import contactsRoutes from './routes/contactsRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import documentsRoutes from './routes/documentsRoutes.js';
import applicationDocumentsRoutes from './routes/applicationDocumentsRoutes.js';
import birthdaysRoutes from './routes/birthdaysRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import videosRoutes from './routes/videosRoutes.js';
import albumsRoutes from './routes/albumsRoutes.js';
import sdkRoutes from './routes/sdkRoutes.js';
import regulationsRoutes from './routes/regulationsRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import siteSettingsRoutes from './routes/siteSettingsRoutes.js';

const app = express();
const PORT = process.env.PORT || 3003;

// --- Настройка CORS ---
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5174',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(morgan('dev'));
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: ${origin} is not allowed`));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/championship', championshipRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/application-documents', applicationDocumentsRoutes);
app.use('/api/birthdays', birthdaysRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/albums', albumsRoutes);
app.use('/api/sdk', sdkRoutes);
app.use('/api/regulations', regulationsRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/site-settings', siteSettingsRoutes);

// --- ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ---

// Ошибки загрузки — не сбой сервера, а нормальный отказ по вине запроса.
// Без этой раскладки multer отдавал 500 и своё англоязычное «File too large»,
// которое уходило прямо в интерфейс.
const UPLOAD_ERRORS = {
  LIMIT_FILE_SIZE: { status: 413, message: 'Файл слишком большой. Максимальный размер — 15 МБ.' },
  LIMIT_FILE_COUNT: { status: 413, message: 'Слишком много файлов за одну загрузку.' },
  LIMIT_UNEXPECTED_FILE: { status: 400, message: 'Неожиданное поле с файлом в запросе.' },
};

app.use((err, req, res, next) => {
  const upload = err.name === 'MulterError' ? UPLOAD_ERRORS[err.code] : null;
  const invalidType = err.message === 'INVALID_FILE_TYPE'
    ? { status: 415, message: 'Неподдерживаемый формат. Загрузите JPEG, PNG или WebP.' }
    : null;
  const known = upload || invalidType;

  if (known) {
    // Ожидаемый отказ, а не авария — в лог одной строкой, без стека
    console.warn(`Отклонена загрузка (${req.originalUrl}): ${err.code || err.message}`);
  } else {
    console.error('🚨 Критическая системная ошибка:', err);
  }

  const status = known?.status || err.status || 500;
  const message = known?.message || err.message || 'Внутренняя ошибка сервера';

  // Поле message — то, что читает фронт (api/client.js) и что возвращают все
  // контроллеры. error оставлен для обратной совместимости.
  res.status(status).json({ success: false, message, error: message });
});

// Порт открываем сразу, не дожидаясь БД — /api/health в неё не ходит, и healthcheck
// платформы не должен зависеть от того, насколько быстро/медленно отвечает Postgres.
// Проверка соединения — фоновая, только для лога.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

tfhPool.query('SELECT NOW()')
  .then((res) => console.log('PostgreSQL (TFH) connected:', res.rows[0].now))
  .catch((err) => console.error('PostgreSQL (TFH) connection check failed:', err.message));

// Подписание согласий — единственная запись сайта в общую базу, и идёт она через функции:
// tfh_sign_consent (человек в заявке команды) и tfh_sign_reserve_consent (резервный вратарь
// лиги), см. ConsentController. Проверяем на старте, что обе есть и их можно вызвать: иначе
// о поломке узнаёт игрок при следующей попытке подписать, а между попытками, как показывал
// лог, проходят дни. Порт при этом открываем всё равно — сайт без подписания лучше, чем
// сайт, который не поднялся.
const CONSENT_FUNCTIONS = [
  { name: 'tfh_sign_consent', what: 'ПОДПИСАНИЕ СОГЛАСИЙ НЕ РАБОТАЕТ' },
  { name: 'tfh_sign_reserve_consent', what: 'ПОДПИСАНИЕ СОГЛАСИЙ РЕЗЕРВНЫМИ ВРАТАРЯМИ НЕ РАБОТАЕТ' },
];

for (const fn of CONSENT_FUNCTIONS) {
  sharedPool.query(
    `SELECT has_function_privilege(current_user, 'public.${fn.name}(int, int, text, date)', 'EXECUTE') AS ok`
  )
    .then(({ rows }) => {
      if (rows[0]?.ok) {
        console.log(`PostgreSQL (shared): функция ${fn.name} доступна`);
      } else {
        console.error(`🚨 PostgreSQL (shared): у роли нет права вызвать ${fn.name} — ${fn.what}. Нужен GRANT EXECUTE от владельца базы.`);
      }
    })
    .catch((err) => {
      // 42883 = функции нет вовсе (не создали или удалили вместе с чем-то ещё)
      const reason = err.code === '42883'
        ? `функции ${fn.name} нет в базе`
        : `проверка не удалась: ${err.message}`;
      console.error(`🚨 PostgreSQL (shared): ${reason} — ${fn.what}.`);
    });
}

// Журнал подписаний в базе сайта должен принимать подписи резервных вратарей: у них нет
// заявки, вместо неё — reserve_goalie_id. Без этой колонки подписание резервом падает
// на записи журнала.
tfhPool.query(
  `SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roster_consent_signatures' AND column_name = 'reserve_goalie_id'`
)
  .then(({ rowCount }) => {
    if (rowCount === 0) {
      console.error('🚨 PostgreSQL (TFH): в журнале roster_consent_signatures нет колонки reserve_goalie_id — ПОДПИСАНИЕ СОГЛАСИЙ РЕЗЕРВНЫМИ ВРАТАРЯМИ НЕ РАБОТАЕТ.');
    }
  })
  .catch((err) => console.error('PostgreSQL (TFH): проверка журнала согласий не удалась:', err.message));
