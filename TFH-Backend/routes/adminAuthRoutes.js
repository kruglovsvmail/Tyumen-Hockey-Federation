import { Router } from 'express';
import { login } from '../controllers/AdminAuthController.js';

const router = Router();

router.post('/login', login);

export default router;
