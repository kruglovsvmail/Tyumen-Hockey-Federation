// Реальный адрес клиента. Сайт работает за прокси платформы, поэтому req.ip — это адрес
// прокси, а настоящий приезжает в X-Forwarded-For.
//
// Через app.set('trust proxy') не идём намеренно: это глобально меняет поведение
// req.ip / req.protocol / req.secure для всего приложения и требует точно знать число
// прокси перед сервером. Здесь адрес нужен ровно в двух местах (запись о подписании
// согласия и счётчик ограничения частоты), поэтому разбираем заголовок точечно — так же,
// как это сделано в Team Room (TR-Backend/controllers/PolicyController.js).
export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
};
