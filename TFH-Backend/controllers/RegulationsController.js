import { tfhPool } from '../config/db.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

/**
 * Положения дивизиона — PDF, которые админ сайта заводит прямо здесь, в режиме
 * редактирования. Раньше вкладка показывала единственный файл из LMS
 * (divisions.regulations_url), но у дивизиона бывает несколько документов, и
 * состав их решает федерация, а не администратор лиги.
 *
 * Дивизионы живут в общей базе лиги, положения — в базе сайта, поэтому division_id
 * здесь обычное число без внешнего ключа: связать таблицы из разных баз нечем
 * (та же история, что у sdk_penalty_images с сезоном).
 */

const toDto = (row) => ({
  id: row.id,
  divisionId: row.division_id,
  title: row.title,
  fileUrl: publicS3Url(row.file_filename),
});

export const getRegulations = async (req, res) => {
  const divisionId = Number(req.query.divisionId);
  if (!divisionId) return res.status(400).json({ message: 'Не указан дивизион' });

  const { rows } = await tfhPool.query(
    'SELECT * FROM division_regulations WHERE division_id = $1 ORDER BY id',
    [divisionId]
  );
  res.json({ regulations: rows.map(toDto) });
};

export const createRegulation = async (req, res) => {
  const divisionId = Number(req.body.divisionId);
  const { title } = req.body;

  if (!divisionId) return res.status(400).json({ message: 'Не указан дивизион' });
  if (!title) return res.status(400).json({ message: 'Укажите название документа' });
  if (!req.file) return res.status(400).json({ message: 'Прикрепите PDF-файл' });

  const key = await uploadBuffer(req.file.buffer, 'regulations', {
    contentType: 'application/pdf',
    extension: 'pdf',
  });

  const { rows } = await tfhPool.query(
    'INSERT INTO division_regulations (division_id, title, file_filename) VALUES ($1, $2, $3) RETURNING *',
    [divisionId, title, key]
  );

  res.status(201).json({ regulation: toDto(rows[0]) });
};

export const updateRegulation = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  const { rows: existingRows } = await tfhPool.query(
    'SELECT * FROM division_regulations WHERE id = $1',
    [id]
  );
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ message: 'Документ не найден' });

  // Файл заменяется только если его прислали: чаще правят одно название
  let key = existing.file_filename;
  if (req.file) {
    key = await uploadBuffer(req.file.buffer, 'regulations', {
      contentType: 'application/pdf',
      extension: 'pdf',
    });
    await deleteObject(existing.file_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE division_regulations SET title = $1, file_filename = $2 WHERE id = $3 RETURNING *',
    [title || existing.title, key, id]
  );

  res.json({ regulation: toDto(rows[0]) });
};

export const deleteRegulation = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query(
    'DELETE FROM division_regulations WHERE id = $1 RETURNING *',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Документ не найден' });

  await deleteObject(rows[0].file_filename);
  res.status(204).send();
};
