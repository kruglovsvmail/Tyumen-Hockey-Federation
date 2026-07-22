import { tfhPool } from '../config/db.js';
import { processLogo } from '../utils/imageProcessor.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const toDto = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  linkUrl: row.link_url,
  logoUrl: publicS3Url(row.logo_filename),
});

export const getPartners = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM partners ORDER BY id');
  res.json({ partners: rows.map(toDto) });
};

export const createPartner = async (req, res) => {
  const { name, description, linkUrl } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Укажите название партнёра' });
  }

  let key = null;
  if (req.file) {
    const buffer = await processLogo(req.file.buffer);
    key = await uploadBuffer(buffer, 'partners');
  }

  const { rows } = await tfhPool.query(
    'INSERT INTO partners (name, description, link_url, logo_filename) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, description || null, linkUrl || null, key]
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

  let key = existing.logo_filename;
  if (req.file) {
    const buffer = await processLogo(req.file.buffer);
    key = await uploadBuffer(buffer, 'partners');
    await deleteObject(existing.logo_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE partners SET name = $1, description = $2, link_url = $3, logo_filename = $4 WHERE id = $5 RETURNING *',
    [name || existing.name, description ?? existing.description, linkUrl || null, key, id]
  );

  res.json({ partner: toDto(rows[0]) });
};

export const deletePartner = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM partners WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Партнёр не найден' });
  }
  await deleteObject(rows[0].logo_filename);
  res.status(204).send();
};
