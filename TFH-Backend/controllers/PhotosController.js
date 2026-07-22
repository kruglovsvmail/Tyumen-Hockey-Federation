import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { tfhPool } from '../config/db.js';
import { processGalleryPhoto } from '../utils/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/image/gallery');

const toDto = (row) => ({
  id: row.id,
  url: `/image/gallery/${row.filename}`,
});

export const getAlbumPhotos = async (req, res) => {
  const { albumId } = req.params;

  const { rows: albumRows } = await tfhPool.query(
    'SELECT id, title FROM photo_albums WHERE id = $1',
    [albumId]
  );
  if (albumRows.length === 0) {
    return res.status(404).json({ message: 'Альбом не найден' });
  }

  const { rows } = await tfhPool.query(
    'SELECT * FROM photos WHERE album_id = $1 ORDER BY id',
    [albumId]
  );

  res.json({ album: { id: albumRows[0].id, title: albumRows[0].title }, photos: rows.map(toDto) });
};

export const addAlbumPhotos = async (req, res) => {
  const { albumId } = req.params;

  const { rows: albumRows } = await tfhPool.query('SELECT id FROM photo_albums WHERE id = $1', [albumId]);
  if (albumRows.length === 0) {
    return res.status(404).json({ message: 'Альбом не найден' });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: 'Выберите хотя бы один файл' });
  }

  await fs.mkdir(PHOTOS_DIR, { recursive: true });

  const inserted = [];
  for (const file of files) {
    const buffer = await processGalleryPhoto(file.buffer);
    const filename = `${crypto.randomUUID()}.webp`;
    await fs.writeFile(path.join(PHOTOS_DIR, filename), buffer);

    const { rows } = await tfhPool.query(
      'INSERT INTO photos (album_id, filename) VALUES ($1, $2) RETURNING *',
      [albumId, filename]
    );
    inserted.push(toDto(rows[0]));
  }

  res.status(201).json({ photos: inserted });
};

export const deleteAlbumPhoto = async (req, res) => {
  const { albumId, photoId } = req.params;

  const { rows } = await tfhPool.query(
    'DELETE FROM photos WHERE id = $1 AND album_id = $2 RETURNING *',
    [photoId, albumId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Фото не найдено' });
  }

  await fs.unlink(path.join(PHOTOS_DIR, rows[0].filename)).catch(() => {});

  res.status(204).send();
};
