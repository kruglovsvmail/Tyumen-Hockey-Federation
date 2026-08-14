import { Router } from 'express';
import uploadDocument from '../config/uploadDocument.js';
import { verifyToken } from '../middleware/auth.js';
import {
  getRegulations,
  createRegulation,
  updateRegulation,
  deleteRegulation,
} from '../controllers/RegulationsController.js';

const router = Router();

// uploadDocument — тот же PDF-only инстанс multer, что и у документов организации:
// в положения принимаем только PDF, иначе их нечем будет показать в просмотрщике
router.get('/', getRegulations);
router.post('/', verifyToken, uploadDocument.single('file'), createRegulation);
router.put('/:id', verifyToken, uploadDocument.single('file'), updateRegulation);
router.delete('/:id', verifyToken, deleteRegulation);

export default router;
