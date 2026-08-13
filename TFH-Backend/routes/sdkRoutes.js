import { Router } from 'express';
import uploadSdkImage from '../config/uploadSdkImage.js';
import { verifyToken } from '../middleware/auth.js';
import {
  getPenaltyImages,
  addPenaltyImages,
  deletePenaltyImage,
  getMeetings,
  getMeeting,
} from '../controllers/SdkController.js';

const router = Router();

// ТАБЛИЦА ШТРАФОВ
router.get('/penalty-images', getPenaltyImages);
router.post('/penalty-images', verifyToken, uploadSdkImage.array('images', 20), addPenaltyImages);
router.delete('/penalty-images/:id', verifyToken, deletePenaltyImage);

// ПРОТОКОЛЫ СДК — только чтение: заседания ведутся в LMS
router.get('/meetings', getMeetings);
router.get('/meetings/:id', getMeeting);

export default router;
