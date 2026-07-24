import { tfhPool } from '../config/db.js';
import { processNewsImage } from '../utils/imageProcessor.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

// Лента на главной показывает только 2 последние новости (не считая виртуального блока
// поздравления с ДР, см. BirthdaysController.js) — раздела "архив всех новостей" нет
const FEED_LIMIT = 2;

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  imageUrl: publicS3Url(row.image_filename),
  createdAt: row.created_at,
});

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

  let key = null;
  if (req.file) {
    const buffer = await processNewsImage(req.file.buffer);
    key = await uploadBuffer(buffer, 'news');
  }

  const { rows } = await tfhPool.query(
    'INSERT INTO news (title, body, image_filename) VALUES ($1, $2, $3) RETURNING *',
    [title, body, key]
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

  let key = existing.image_filename;
  if (req.file) {
    const buffer = await processNewsImage(req.file.buffer);
    key = await uploadBuffer(buffer, 'news');
    await deleteObject(existing.image_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE news SET title = $1, body = $2, image_filename = $3 WHERE id = $4 RETURNING *',
    [title || existing.title, body || existing.body, key, id]
  );

  res.json({ item: toDto(rows[0]) });
};

export const deleteNews = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM news WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Новость не найдена' });
  }
  await deleteObject(rows[0].image_filename);
  res.status(204).send();
};
