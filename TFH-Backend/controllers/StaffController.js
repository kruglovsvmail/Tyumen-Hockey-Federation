import { tfhPool } from '../config/db.js';
import { processAvatar } from '../utils/imageProcessor.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const toDto = (row) => ({
  id: row.id,
  fullName: row.full_name,
  position: row.position,
  photoUrl: publicS3Url(row.photo_filename),
});

export const getStaff = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM staff_members ORDER BY id');
  res.json({ staff: rows.map(toDto) });
};

export const createStaff = async (req, res) => {
  const { fullName, position } = req.body;
  if (!fullName || !position) {
    return res.status(400).json({ message: 'Укажите ФИО и должность' });
  }

  let key = null;
  if (req.file) {
    const buffer = await processAvatar(req.file.buffer);
    key = await uploadBuffer(buffer, 'avatars');
  }

  const { rows } = await tfhPool.query(
    'INSERT INTO staff_members (full_name, position, photo_filename) VALUES ($1, $2, $3) RETURNING *',
    [fullName, position, key]
  );

  res.status(201).json({ staff: toDto(rows[0]) });
};

export const updateStaff = async (req, res) => {
  const { id } = req.params;
  const { fullName, position } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM staff_members WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Сотрудник не найден' });
  }

  let key = existing.photo_filename;
  if (req.file) {
    const buffer = await processAvatar(req.file.buffer);
    key = await uploadBuffer(buffer, 'avatars');
    await deleteObject(existing.photo_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE staff_members SET full_name = $1, position = $2, photo_filename = $3 WHERE id = $4 RETURNING *',
    [fullName || existing.full_name, position || existing.position, key, id]
  );

  res.json({ staff: toDto(rows[0]) });
};

export const deleteStaff = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM staff_members WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Сотрудник не найден' });
  }
  await deleteObject(rows[0].photo_filename);
  res.status(204).send();
};
