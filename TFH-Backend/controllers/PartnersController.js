import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { tfhPool } from '../config/db.js';
import { processLogo } from '../utils/imageProcessor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Логотипы партнёров — отдельная папка от фото сотрудников (см. обсуждение в чате)
const LOGOS_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/image/partners');

const toDto = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  linkUrl: row.link_url,
  logoUrl: row.logo_filename ? `/image/partners/${row.logo_filename}` : null,
});

const saveUploadedLogo = async (file) => {
  const buffer = await processLogo(file.buffer);
  const filename = `${crypto.randomUUID()}.webp`;
  await fs.mkdir(LOGOS_DIR, { recursive: true });
  await fs.writeFile(path.join(LOGOS_DIR, filename), buffer);
  return filename;
};

const deleteLogo = async (filename) => {
  if (!filename) return;
  await fs.unlink(path.join(LOGOS_DIR, filename)).catch(() => {});
};

export const getPartners = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM partners ORDER BY id');
  res.json({ partners: rows.map(toDto) });
};

export const createPartner = async (req, res) => {
  const { name, description, linkUrl } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Укажите название партнёра' });
  }

  const filename = req.file ? await saveUploadedLogo(req.file) : null;

  const { rows } = await tfhPool.query(
    'INSERT INTO partners (name, description, link_url, logo_filename) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, description || null, linkUrl || null, filename]
  );

  res.status(201).json({ partner: toDto(rows[0]) });
};

export const updatePartner = async (req, res) => {
  const { id } = req.params;
  const { name, description, linkUrl } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM partners WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Партнёр не найден' });
  }

  let filename = existing.logo_filename;
  if (req.file) {
    filename = await saveUploadedLogo(req.file);
    await deleteLogo(existing.logo_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE partners SET name = $1, description = $2, link_url = $3, logo_filename = $4 WHERE id = $5 RETURNING *',
    [name || existing.name, description ?? existing.description, linkUrl || null, filename, id]
  );

  res.json({ partner: toDto(rows[0]) });
};

export const deletePartner = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM partners WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Партнёр не найден' });
  }
  await deleteLogo(rows[0].logo_filename);
  res.status(204).send();
};
