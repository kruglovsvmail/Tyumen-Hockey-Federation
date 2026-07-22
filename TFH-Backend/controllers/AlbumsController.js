import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { tfhPool } from '../config/db.js';
import { processAlbumCover } from '../utils/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COVERS_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/image/albums');
const PHOTOS_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/image/gallery');

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  coverUrl: row.cover_filename ? `/image/albums/${row.cover_filename}` : null,
  photoCount: Number(row.photo_count) || 0,
});

const saveCover = async (file) => {
  const buffer = await processAlbumCover(file.buffer);
  const filename = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(COVERS_DIR, { recursive: true });
  await fs.writeFile(path.join(COVERS_DIR, filename), buffer);
  return filename;
};

const deleteCover = async (filename) => {
  if (!filename) return;
  await fs.unlink(path.join(COVERS_DIR, filename)).catch(() => {});
};

export const getAlbums = async (req, res) => {
  const { rows } = await tfhPool.query(`
    SELECT a.*, COUNT(p.id)::int AS photo_count
    FROM photo_albums a
    LEFT JOIN photos p ON p.album_id = a.id
    GROUP BY a.id
    ORDER BY a.id DESC
  `);
  res.json({ albums: rows.map(toDto) });
};

export const createAlbum = async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Укажите название альбома' });
  }

  const filename = req.file ? await saveCover(req.file) : null;

  const { rows } = await tfhPool.query(
    'INSERT INTO photo_albums (title, cover_filename) VALUES ($1, $2) RETURNING *, 0 AS photo_count',
    [title, filename]
  );

  res.status(201).json({ album: toDto(rows[0]) });
};

export const updateAlbum = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM photo_albums WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Альбом не найден' });
  }

  let filename = existing.cover_filename;
  if (req.file) {
    filename = await saveCover(req.file);
    await deleteCover(existing.cover_filename);
  }

  const { rows } = await tfhPool.query(
    `UPDATE photo_albums SET title = $1, cover_filename = $2 WHERE id = $3
     RETURNING *, (SELECT COUNT(*)::int FROM photos WHERE album_id = $3) AS photo_count`,
    [title || existing.title, filename, id]
  );

  res.json({ album: toDto(rows[0]) });
};

export const deleteAlbum = async (req, res) => {
  const { id } = req.params;

  const { rows: albumRows } = await tfhPool.query('SELECT * FROM photo_albums WHERE id = $1', [id]);
  const album = albumRows[0];
  if (!album) {
    return res.status(404).json({ message: 'Альбом не найден' });
  }

  const { rows: photoRows } = await tfhPool.query('SELECT filename FROM photos WHERE album_id = $1', [id]);

  await tfhPool.query('DELETE FROM photo_albums WHERE id = $1', [id]); // photos удалятся каскадом

  await Promise.all(photoRows.map((p) => fs.unlink(path.join(PHOTOS_DIR, p.filename)).catch(() => {})));
  await deleteCover(album.cover_filename);

  res.status(204).send();
};
