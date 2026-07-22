import jwt from 'jsonwebtoken';

// Базовая проверка JWT. Ролевую модель (кто админ сайта, кто модератор новостей и т.д.)
// добавим отдельно под конкретные права ТФХ — здесь только сама проверка токена.
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Отсутствует токен доступа' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Недействительный или просроченный токен' });
    }
    req.user = decoded;
    next();
  });
};
