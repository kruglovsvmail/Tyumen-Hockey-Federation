import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { tfhPool } from '../config/db.js';
import { processAvatar } from '../utils/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// TFH-Backend и TFH-Frontend — соседние папки, фото сотрудников хранятся статикой во фронтенде
// (см. обсуждение в чате про деплой — в проде это придётся пересмотреть).
const AVATARS_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/image/avatars');

const toDto = (row) => ({
  id: row.id,
  fullName: row.full_name,
  position: row.position,
  photoUrl: row.photo_filename ? `/image/avatars/${row.photo_filename}` : null,
});

const saveUploadedPhoto = async (file) => {
  const buffer = await processAvatar(file.buffer);
  const filename = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(AVATARS_DIR, { recursive: true });
  await fs.writeFile(path.join(AVATARS_DIR, filename), buffer);
  return filename;
};

const deletePhoto = async (filename) => {
  if (!filename) return;
  await fs.unlink(path.join(AVATARS_DIR, filename)).catch(() => {});
};

export const getStaff = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM staff_members ORDER BY id');
  res.json({ staff: rows.map(toDto) });
};

export const createStaff = async (req, res) => {
  const { fullName, position } = req.body;
  if (!fullName || !position) {
    return res.status(400).json({ message: 'Укажите ФИО и должность' });
  }

  const filename = req.file ? await saveUploadedPhoto(req.file) : null;

  const { rows } = await tfhPool.query(
    'INSERT INTO staff_members (full_name, position, photo_filename) VALUES ($1, $2, $3) RETURNING *',
    [fullName, position, filename]
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

  let filename = existing.photo_filename;
  if (req.file) {
    filename = await saveUploadedPhoto(req.file);
    await deletePhoto(existing.photo_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE staff_members SET full_name = $1, position = $2, photo_filename = $3 WHERE id = $4 RETURNING *',
    [fullName || existing.full_name, position || existing.position, filename, id]
  );

  res.json({ staff: toDto(rows[0]) });
};

export const deleteStaff = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM staff_members WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Сотрудник не найден' });
  }
  await deletePhoto(rows[0].photo_filename);
  res.status(204).send();
};
