import { tfhPool } from '../config/db.js';
import { processAlbumCover } from '../utils/imageProcessor.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  coverUrl: publicS3Url(row.cover_filename),
  photoCount: Number(row.photo_count) || 0,
});

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

  let key = null;
  if (req.file) {
    const buffer = await processAlbumCover(req.file.buffer);
    key = await uploadBuffer(buffer, 'albums');
  }

  const { rows } = await tfhPool.query(
    'INSERT INTO photo_albums (title, cover_filename) VALUES ($1, $2) RETURNING *, 0 AS photo_count',
    [title, key]
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

  let key = existing.cover_filename;
  if (req.file) {
    const buffer = await processAlbumCover(req.file.buffer);
    key = await uploadBuffer(buffer, 'albums');
    await deleteObject(existing.cover_filename);
  }

  const { rows } = await tfhPool.query(
    `UPDATE photo_albums SET title = $1, cover_filename = $2 WHERE id = $3
     RETURNING *, (SELECT COUNT(*)::int FROM photos WHERE album_id = $3) AS photo_count`,
    [title || existing.title, key, id]
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

  await Promise.all(photoRows.map((p) => deleteObject(p.filename)));
  await deleteObject(album.cover_filename);

  res.status(204).send();
};
