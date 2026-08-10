import { tfhPool } from '../config/db.js';
import { processGalleryPhoto } from '../utils/imageProcessor.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const toDto = (row) => ({
  id: row.id,
  url: publicS3Url(row.filename),
});

// Порядок в галерее — по исходному имени файла: пачку с камеры («IMG_0041»,
// «IMG_0042») хочется видеть так же, как в папке, а не в порядке, в котором
// браузер отдал файлы.
//
// Сортируем в Node, а не через ORDER BY, из-за чисел: обычное сравнение строк
// ставит «Фото 10» перед «Фото 2». Intl.Collator с numeric разбирает числа как
// числа и заодно корректно работает с кириллицей. Альбомы небольшие (десятки
// снимков), поэтому цена сортировки в приложении нулевая.
//
// Фото, залитые до появления original_name, лежат с NULL: они равны между собой
// и раскладываются по id — то есть сохраняют прежний порядок загрузки.
const nameCollator = new Intl.Collator('ru', { numeric: true, sensitivity: 'base' });

const sortPhotos = (rows) => [...rows].sort((a, b) =>
  nameCollator.compare(a.original_name || '', b.original_name || '') || a.id - b.id
);

const loadAlbumPhotos = async (albumId) => {
  const { rows } = await tfhPool.query(
    'SELECT * FROM photos WHERE album_id = $1',
    [albumId]
  );
  return sortPhotos(rows).map(toDto);
};

export const getAlbumPhotos = async (req, res) => {
  const { albumId } = req.params;

  const { rows: albumRows } = await tfhPool.query(
    'SELECT id, title FROM photo_albums WHERE id = $1',
    [albumId]
  );
  if (albumRows.length === 0) {
    return res.status(404).json({ message: 'Альбом не найден' });
  }

  res.json({
    album: { id: albumRows[0].id, title: albumRows[0].title },
    photos: await loadAlbumPhotos(albumId),
  });
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

  for (const file of files) {
    const buffer = await processGalleryPhoto(file.buffer);
    const key = await uploadBuffer(buffer, 'gallery');

    // original_name нужен только для сортировки: сам файл лежит в S3 под UUID
    // и уже сконвертирован в webp, так что расширение в имени ни на что не влияет.
    await tfhPool.query(
      'INSERT INTO photos (album_id, filename, original_name) VALUES ($1, $2, $3)',
      [albumId, key, file.originalname || null]
    );
  }

  // Возвращаем альбом целиком, а не только добавленное: место новых снимков
  // зависит от их имён, и дописать их в конец списка на клиенте уже нельзя.
  res.status(201).json({ photos: await loadAlbumPhotos(albumId) });
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

  await deleteObject(rows[0].filename);

  res.status(204).send();
};
