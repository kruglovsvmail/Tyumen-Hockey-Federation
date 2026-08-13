import multer from 'multer';

// Блоки таблицы штрафов — только картинки: страницы таблицы, отснятые или
// экспортированные из документа. Ни подписей, ни файлов для скачивания у блока нет.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  return allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('INVALID_FILE_TYPE'), false);
};

const uploadSdkImage = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 МБ
  },
  fileFilter,
});

export default uploadSdkImage;
