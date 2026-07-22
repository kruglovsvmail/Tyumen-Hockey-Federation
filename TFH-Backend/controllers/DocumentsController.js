import { tfhPool } from '../config/db.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  fileUrl: publicS3Url(row.file_filename),
});

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

  const key = await uploadBuffer(req.file.buffer, 'documents', {
    contentType: 'application/pdf',
    extension: 'pdf',
  });

  const { rows } = await tfhPool.query(
    'INSERT INTO documents (title, file_filename) VALUES ($1, $2) RETURNING *',
    [title, key]
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

  let key = existing.file_filename;
  if (req.file) {
    key = await uploadBuffer(req.file.buffer, 'documents', {
      contentType: 'application/pdf',
      extension: 'pdf',
    });
    await deleteObject(existing.file_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE documents SET title = $1, file_filename = $2 WHERE id = $3 RETURNING *',
    [title || existing.title, key, id]
  );

  res.json({ document: toDto(rows[0]) });
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM documents WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Документ не найден' });
  }
  await deleteObject(rows[0].file_filename);
  res.status(204).send();
};
