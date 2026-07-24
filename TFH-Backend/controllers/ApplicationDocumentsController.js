import { tfhPool } from '../config/db.js';
import { uploadBuffer, deleteObject, publicS3Url } from '../utils/s3Storage.js';

const toDto = (row) => ({
  id: row.id,
  title: row.title,
  sampleImageUrl: publicS3Url(row.sample_image_filename),
  formFileUrl: publicS3Url(row.form_file_filename),
});

const extFromImageMime = (mimetype) => {
  if (mimetype === 'image/png') return 'png';
  if (mimetype === 'image/webp') return 'webp';
  return 'jpg';
};

export const getApplicationDocuments = async (req, res) => {
  const { rows } = await tfhPool.query('SELECT * FROM application_documents ORDER BY id');
  res.json({ documents: rows.map(toDto) });
};

export const createApplicationDocument = async (req, res) => {
  const { title } = req.body;
  const sampleImage = req.files?.sampleImage?.[0];
  const formFile = req.files?.formFile?.[0];

  if (!title) {
    return res.status(400).json({ message: 'Укажите заголовок' });
  }
  if (!sampleImage) {
    return res.status(400).json({ message: 'Прикрепите фото заполненного образца' });
  }
  if (!formFile) {
    return res.status(400).json({ message: 'Прикрепите файл бланка (PDF)' });
  }

  const sampleKey = await uploadBuffer(sampleImage.buffer, 'application-documents/samples', {
    contentType: sampleImage.mimetype,
    extension: extFromImageMime(sampleImage.mimetype),
  });
  const formKey = await uploadBuffer(formFile.buffer, 'application-documents/forms', {
    contentType: 'application/pdf',
    extension: 'pdf',
  });

  const { rows } = await tfhPool.query(
    'INSERT INTO application_documents (title, sample_image_filename, form_file_filename) VALUES ($1, $2, $3) RETURNING *',
    [title, sampleKey, formKey]
  );

  res.status(201).json({ document: toDto(rows[0]) });
};

export const updateApplicationDocument = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  const sampleImage = req.files?.sampleImage?.[0];
  const formFile = req.files?.formFile?.[0];

  const { rows: existingRows } = await tfhPool.query('SELECT * FROM application_documents WHERE id = $1', [id]);
  const existing = existingRows[0];
  if (!existing) {
    return res.status(404).json({ message: 'Документ не найден' });
  }

  let sampleKey = existing.sample_image_filename;
  if (sampleImage) {
    sampleKey = await uploadBuffer(sampleImage.buffer, 'application-documents/samples', {
      contentType: sampleImage.mimetype,
      extension: extFromImageMime(sampleImage.mimetype),
    });
    await deleteObject(existing.sample_image_filename);
  }

  let formKey = existing.form_file_filename;
  if (formFile) {
    formKey = await uploadBuffer(formFile.buffer, 'application-documents/forms', {
      contentType: 'application/pdf',
      extension: 'pdf',
    });
    await deleteObject(existing.form_file_filename);
  }

  const { rows } = await tfhPool.query(
    'UPDATE application_documents SET title = $1, sample_image_filename = $2, form_file_filename = $3 WHERE id = $4 RETURNING *',
    [title || existing.title, sampleKey, formKey, id]
  );

  res.json({ document: toDto(rows[0]) });
};

export const deleteApplicationDocument = async (req, res) => {
  const { id } = req.params;
  const { rows } = await tfhPool.query('DELETE FROM application_documents WHERE id = $1 RETURNING *', [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Документ не найден' });
  }
  await deleteObject(rows[0].sample_image_filename);
  await deleteObject(rows[0].form_file_filename);
  res.status(204).send();
};
