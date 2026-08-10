// Уменьшение снимка прямо в браузере, до отправки на сервер.
//
// Почему на клиенте, а не на сервере: лимит multer срабатывает во время приёма
// файла — поток обрывается, и до кода дело не доходит. Сжать то, что не доехало,
// нельзя. Ужимать надо там, где файл ещё целиком доступен, то есть в браузере.
//
// Сервер и так пережимает картинки (sharp: обложка 800px, фото галереи 1600px
// webp). Здесь задача другая — не качество, а вес запроса: не упереться в лимит,
// быстрее загружать пачки и не держать в памяти сервера десятки мегабайт
// (multer настроен на memoryStorage, файл целиком лежит в RAM).

const MAX_DIMENSION = 2000;          // с запасом к серверным 1600px
const COMPRESS_ABOVE_BYTES = 2 * 1024 * 1024;
const QUALITY = 0.85;

export async function compressImage(file) {
  if (!file.type?.startsWith('image/')) return file;

  let bitmap;
  try {
    // imageOrientation обязателен: canvas не переносит EXIF, а сервер вращает
    // снимок именно по EXIF (sharp .rotate()). Без этого флага метка ориентации
    // пропадёт вместе с ней, и вертикальные фото с телефона лягут набок.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Формат, который браузер не осилил, отдаём как есть — пусть решает сервер
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

  // Небольшой и некрупный файл трогать незачем: перекодирование только съест
  // качество и время
  if (scale === 1 && file.size <= COMPRESS_ABOVE_BYTES) {
    bitmap.close();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY)
  );

  // toBlob может вернуть null, а на уже сжатых картинках результат иногда
  // выходит тяжелее исходника — в обоих случаях оригинал лучше
  if (!blob || blob.size >= file.size) return file;

  // Имя файла сохраняем как есть: галерея сортируется по photos.original_name,
  // и подмена имени сломала бы порядок. Расхождение расширения с webp роли не
  // играет — имя нужно только для сортировки, формат сервер определяет по данным.
  return new File([blob], file.name, {
    type: blob.type,
    lastModified: file.lastModified,
  });
}

export async function compressImages(files, onProgress) {
  const result = [];
  for (let i = 0; i < files.length; i += 1) {
    result.push(await compressImage(files[i]));
    onProgress?.(i + 1, files.length);
  }
  return result;
}
