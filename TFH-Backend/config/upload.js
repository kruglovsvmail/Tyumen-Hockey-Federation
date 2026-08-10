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
    // 15 МБ, как у документов. Строгий лимит на входе тут мало что даёт: sharp
    // всё равно ужимает обложку до 800px, а фото галереи до 1600px webp — на
    // выходе пара сотен килобайт независимо от того, что прислали. Прежние 5 МБ
    // просто отбивали обычный снимок с телефона.
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter,
  // Без этого busboy читает имя файла как latin1 (его умолчание), и «Фото 1.jpg»
  // приезжает искажённым. Раньше это было незаметно — имя выбрасывалось, файл
  // клался в S3 под UUID. Теперь оно сохраняется в photos.original_name и по нему
  // сортируется галерея, так что кодировка стала важна.
  defParamCharset: 'utf8',
});

export default upload;
