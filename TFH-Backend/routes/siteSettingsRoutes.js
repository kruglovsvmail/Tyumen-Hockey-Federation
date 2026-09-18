import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getSiteSettings, updateSiteSettings } from '../controllers/SiteSettingsController.js';

const router = Router();

router.get('/', getSiteSettings);
router.put('/', verifyToken, updateSiteSettings);

export default router;
