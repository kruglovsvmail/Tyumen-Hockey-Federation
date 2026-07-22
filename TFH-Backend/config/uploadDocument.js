import multer from 'multer';

// Отдельный от config/upload.js инстанс — здесь принимаем только PDF, и лимит выше
// (документы обычно тяжелее фото).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE'), false);
  }
};

const uploadDocument = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 МБ
  },
  fileFilter,
});

export default uploadDocument;
