import { Router } from 'express';
import uploadDocument from '../config/uploadDocument.js';
import { verifyToken } from '../middleware/auth.js';
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/DocumentsController.js';

const router = Router();

router.get('/', getDocuments);
router.post('/', verifyToken, uploadDocument.single('file'), createDocument);
router.put('/:id', verifyToken, uploadDocument.single('file'), updateDocument);
router.delete('/:id', verifyToken, deleteDocument);

export default router;
