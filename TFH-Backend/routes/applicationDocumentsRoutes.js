import { Router } from 'express';
import uploadApplicationDocument from '../config/uploadApplicationDocument.js';
import { verifyToken } from '../middleware/auth.js';
import {
  getApplicationDocuments,
  createApplicationDocument,
  updateApplicationDocument,
  deleteApplicationDocument,
} from '../controllers/ApplicationDocumentsController.js';

const router = Router();

const uploadFields = uploadApplicationDocument.fields([
  { name: 'sampleImage', maxCount: 1 },
  { name: 'formFile', maxCount: 1 },
]);

router.get('/', getApplicationDocuments);
router.post('/', verifyToken, uploadFields, createApplicationDocument);
router.put('/:id', verifyToken, uploadFields, updateApplicationDocument);
router.delete('/:id', verifyToken, deleteApplicationDocument);

export default router;
