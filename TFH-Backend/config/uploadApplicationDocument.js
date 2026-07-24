import multer from 'multer';

// Два разных файла в одном блоке: sampleImage — фото/скан заполненного образца
// (картинка, открывается для просмотра), formFile — пустой бланк для скачивания (PDF).
// Тип проверяем по имени поля, а не общим списком мимтайпов на весь роут.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'sampleImage') {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    return allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('INVALID_FILE_TYPE'), false);
  }
  if (file.fieldname === 'formFile') {
    return file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('INVALID_FILE_TYPE'), false);
  }
  cb(new Error('INVALID_FIELD'), false);
};

const uploadApplicationDocument = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 МБ
  },
  fileFilter,
});

export default uploadApplicationDocument;
