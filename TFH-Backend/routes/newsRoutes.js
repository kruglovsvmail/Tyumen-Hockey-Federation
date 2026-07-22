import { Router } from 'express';
import upload from '../config/upload.js';
import { verifyToken } from '../middleware/auth.js';
import { getNews, createNews, updateNews, deleteNews } from '../controllers/NewsController.js';

const router = Router();

router.get('/', getNews);
router.post('/', verifyToken, upload.single('image'), createNews);
router.put('/:id', verifyToken, upload.single('image'), updateNews);
router.delete('/:id', verifyToken, deleteNews);

export default router;
