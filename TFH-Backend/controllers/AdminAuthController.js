import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { tfhPool } from '../config/db.js';

export const login = async (req, res) => {
  const { login: loginValue, password } = req.body;

  if (!loginValue || !password) {
    return res.status(400).json({ message: 'Укажите логин и пароль' });
  }

  const { rows } = await tfhPool.query(
    'SELECT id, login, password_hash FROM admins WHERE login = $1',
    [loginValue]
  );
  const admin = rows[0];

  if (!admin) {
    return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  const passwordMatches = await bcrypt.compare(password, admin.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Неверный логин или пароль' });
  }

  const token = jwt.sign({ id: admin.id, login: admin.login }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.json({ token });
};
