import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getVideos, createVideo, updateVideo, deleteVideo } from '../controllers/VideosController.js';

const router = Router();

router.get('/', getVideos);
router.post('/', verifyToken, createVideo);
router.put('/:id', verifyToken, updateVideo);
router.delete('/:id', verifyToken, deleteVideo);

export default router;
