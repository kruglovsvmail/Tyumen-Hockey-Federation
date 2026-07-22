import { Router } from 'express';
import upload from '../config/upload.js';
import { verifyToken } from '../middleware/auth.js';
import { getPartners, createPartner, updatePartner, deletePartner } from '../controllers/PartnersController.js';

const router = Router();

router.get('/', getPartners);
router.post('/', verifyToken, upload.single('logo'), createPartner);
router.put('/:id', verifyToken, upload.single('logo'), updatePartner);
router.delete('/:id', verifyToken, deletePartner);

export default router;
