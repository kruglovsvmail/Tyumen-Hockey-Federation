import { Router } from 'express';
import { getTodayBirthdays } from '../controllers/BirthdaysController.js';

const router = Router();

router.get('/today', getTodayBirthdays);

export default router;
