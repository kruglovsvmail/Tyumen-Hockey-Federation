import { Router } from 'express';
import upload from '../config/upload.js';
import { verifyToken } from '../middleware/auth.js';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../controllers/StaffController.js';

const router = Router();

router.get('/', getStaff);
router.post('/', verifyToken, upload.single('photo'), createStaff);
router.put('/:id', verifyToken, upload.single('photo'), updateStaff);
router.delete('/:id', verifyToken, deleteStaff);

export default router;
