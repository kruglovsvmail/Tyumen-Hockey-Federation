import { Router } from 'express';
import { getSeasons, getDivisions, getTournaments } from '../controllers/ChampionshipController.js';

const router = Router();

router.get('/seasons', getSeasons);
router.get('/divisions', getDivisions);
router.get('/tournaments', getTournaments);

export default router;
