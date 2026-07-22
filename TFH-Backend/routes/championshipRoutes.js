import { Router } from 'express';
import { getSeasons, getDivisions } from '../controllers/ChampionshipController.js';

const router = Router();

router.get('/seasons', getSeasons);
router.get('/divisions', getDivisions);

export default router;
