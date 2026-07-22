import sharp from 'sharp';

// Обработка фото сотрудника перед сохранением:
//  - авто-поворот по EXIF (фото с телефона часто "лежат на боку");
//  - обрезаем под прямоугольник-портрет 4:5 (карточки на сайте показывают фото именно так,
//    не квадратом), берём верхнюю часть кадра, чтобы не срезать голову на портретных фото;
//  - конвертируем в WebP (компактный формат) с разумным качеством.
// Возвращает готовый Buffer (image/webp).
export const processAvatar = async (buffer) => {
  return sharp(buffer)
    .rotate()
    .resize(480, 600, { fit: 'cover', position: 'top' })
    .webp({ quality: 82 })
    .toBuffer();
};

// Обработка логотипа партнёра: в отличие от фото сотрудника — НЕ обрезаем (у логотипов важны
// края), вписываем в квадрат 400×400 с сохранением пропорций, пустое место — прозрачное.
export const processLogo = async (buffer) => {
  return sharp(buffer)
    .resize(400, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
};

// Обработка изображения к новости: без обрезки (это может быть фото команды, события —
// заранее неизвестная композиция, кадрировать нельзя), просто вписываем в разумный размер.
export const processNewsImage = async (buffer) => {
  return sharp(buffer)
    .rotate()
    .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
};

// Общий помощник: вписать в квадрат maxSize×maxSize без обрезки и апскейла, сконвертировать в webp.
const resizeToWebp = (buffer, maxSize, quality = 82) =>
  sharp(buffer)
    .rotate()
    .resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

// Обложка альбома — карточка в сетке, крупный размер не нужен
export const processAlbumCover = (buffer) => resizeToWebp(buffer, 800);

// Фото в галерее — открываются на весь экран в карусели, поэтому размер побольше,
// но всё равно ужимаем: пользователи часто грузят фото 4000×3000 и больше "как есть" с телефона.
export const processGalleryPhoto = (buffer) => resizeToWebp(buffer, 1600);
