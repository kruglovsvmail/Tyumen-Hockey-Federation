import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { tfhPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// PDF-документы — не изображения, поэтому отдельная папка files/, а не image/
const DOCS_DIR = path.resolve(__dirname, '../../TFH-Frontend/public/files/documents');

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  fileUrl: row.file_filename ? `/files/documents/${row.file_filename}` : null,
});

const saveUploadedFile = async (file) => {
  const filename = `${crypto.randomUUID()}.pdf`;
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.writeFile(path.join(DOCS_DIR, filename), file.buffer);
  return filename;
};

const deleteFile = async (filename) => {
  if (!filename) return;
  await fs.unlink(path.join(DOCS_DIR, filename)).catch(() => {});
};

export const getDocuments = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM documents ORDER BY id');
  res.json({ documents: rows.map(toDto) });
};

export const createDocument = async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ message: 'Укажите название документа' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'Прикрепите PDF-файл' });
  }

  const filename = await saveUploadedFile(req.file);

  const { rows } = await tfhPool.query(
    'INSERT INTO documents (title, file_filename) VALUES ($1, $2) RETURNING *',
    [title, filename]
  );

  res.status(201).json({ document: toDto(rows[0]) });
};

export const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM documents WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Документ не найден' });
  }

  let filename = existing.file_filename;
  if (req.file) {
    filename = await saveUploadedFile(req.file);
    await deleteFile(existing.file_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE documents SET title = $1, file_filename = $2 WHERE id = $3 RETURNING *',
    [title || existing.title, filename, id]
  );

  res.json({ document: toDto(rows[0]) });
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Документ не найден' });
  }
  await deleteFile(rows[0].file_filename);
  res.status(204).send();
};
