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
import organizationRoutes from './routes/organizationRoutes.js';
import videosRoutes from './routes/videosRoutes.js';
import albumsRoutes from './routes/albumsRoutes.js';

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
app.use('/api/organization', organizationRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/albums', albumsRoutes);

// --- ГЛОБАЛЬНЫЙ ОБРАБОТЧИК ОШИБОК ---
app.use((err, req, res, next) => {
  console.error('🚨 Критическая системная ошибка:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

const startServer = async () => {
  try {
    const res = await tfhPool.query('SELECT NOW()');
    console.log('PostgreSQL (TFH) connected:', res.rows[0].now);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
