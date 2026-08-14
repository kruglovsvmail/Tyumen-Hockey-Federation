process.env.TZ = 'UTC';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';

import { tfhPool } from './config/db.js';
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
