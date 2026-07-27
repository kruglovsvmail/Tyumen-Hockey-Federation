const S3_BUCKET = 'hockeyeco-uploads';
const S3_HOST = 's3.twcstorage.ru';

// Логотипы/джерси команд из общей БД LMS/TR хранятся относительным путём
// (например "/uploads/teams_5_logo.webp"), а не полной ссылкой — в отличие от
// картинок самого ТФХ (news/photos/...), которые уже приходят готовым URL.
// Пропускаем то, что уже абсолютный адрес, остальное достраиваем до S3.
export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `https://${S3_BUCKET}.${S3_HOST}/${cleanPath}`;
}
