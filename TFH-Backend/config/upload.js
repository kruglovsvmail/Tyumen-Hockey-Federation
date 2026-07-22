import multer from 'multer';

// Держим файл в памяти — на диск в public/image/avatars пишем сами после обработки sharp'ом
// (см. utils/imageProcessor.js), а не то, что прислали "как есть".
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 МБ
  },
  fileFilter,
});

export default upload;
