import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { tfhPool } from '../config/db.js';
import { processNewsImage } from '../utils/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Изображения новостей — отдельная папка от avatars/partners
const NEWS_IMAGES_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/image/news');

// Лента на главной показывает только 5 последних новостей — раздела "архив всех новостей" нет
const FEED_LIMIT = 5;

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  imageUrl: row.image_filename ? `/image/news/${row.image_filename}` : null,
  createdAt: row.created_at,
});

const saveUploadedImage = async (file) => {
  const buffer = await processNewsImage(file.buffer);
  const filename = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(NEWS_IMAGES_DIR, { recursive: true });
  await fs.writeFile(path.join(NEWS_IMAGES_DIR, filename), buffer);
  return filename;
};

const deleteImage = async (filename) => {
  if (!filename) return;
  await fs.unlink(path.join(NEWS_IMAGES_DIR, filename)).catch(() => {});
};

export const getNews = async (req, res) => {
  const { rows } = await tfhPool.query(
    'SELECT * FROM news ORDER BY created_at DESC, id DESC LIMIT $1',
    [FEED_LIMIT]
  );
  res.json({ news: rows.map(toDto) });
};

export const createNews = async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: 'Укажите заголовок и текст новости' });
  }

  const filename = req.file ? await saveUploadedImage(req.file) : null;

  const { rows } = await tfhPool.query(
    'INSERT INTO news (title, body, image_filename) VALUES ($1, $2, $3) RETURNING *',
    [title, body, filename]
  );

  res.status(201).json({ item: toDto(rows[0]) });
};

export const updateNews = async (req, res) => {
  const { id } = req.params;
  const { title, body } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM news WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Новость не найдена' });
  }

  let filename = existing.image_filename;
  if (req.file) {
    filename = await saveUploadedImage(req.file);
    await deleteImage(existing.image_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE news SET title = $1, body = $2, image_filename = $3 WHERE id = $4 RETURNING *',
    [title || existing.title, body || existing.body, filename, id]
  );

  res.json({ item: toDto(rows[0]) });
};

export const deleteNews = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM news WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Новость не найдена' });
  }
  await deleteImage(rows[0].image_filename);
  res.status(204).send();
};
