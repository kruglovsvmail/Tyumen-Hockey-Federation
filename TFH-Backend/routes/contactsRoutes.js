import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getContacts, updateContacts } from '../controllers/ContactsController.js';

const router = Router();

router.get('/', getContacts);
router.put('/', verifyToken, updateContacts);

export default router;
