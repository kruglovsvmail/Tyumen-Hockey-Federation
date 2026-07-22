import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getOrganization, updateOrganization } from '../controllers/OrganizationController.js';

const router = Router();

router.get('/', getOrganization);
router.put('/', verifyToken, updateOrganization);

export default router;
