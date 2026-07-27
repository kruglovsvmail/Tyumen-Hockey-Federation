import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getSeasons,
  getDivisions,
  getTournaments,
  getDivisionDetail,
  getDivisionStandings,
  getDivisionGames,
  getDivisionWeekGames,
  getHomeWeekGames,
  getDivisionPlayoff,
  getDivisionTeams,
  getTeamDetail,
  setGameDateEstimate,
  deleteGameDateEstimate,
  setDivisionPlayoffVisibility,
} from '../controllers/ChampionshipController.js';

const router = Router();

router.get('/week-games', getHomeWeekGames);
router.get('/seasons', getSeasons);
router.get('/divisions', getDivisions);
router.get('/tournaments', getTournaments);

router.get('/divisions/:id', getDivisionDetail);
router.get('/divisions/:id/standings', getDivisionStandings);
router.get('/divisions/:id/games', getDivisionGames);
router.get('/divisions/:id/week-games', getDivisionWeekGames);
router.get('/divisions/:id/playoff', getDivisionPlayoff);
router.get('/divisions/:id/teams', getDivisionTeams);
router.get('/teams/:tournamentTeamId', getTeamDetail);

router.put('/games/:gameId/date-estimate', verifyToken, setGameDateEstimate);
router.delete('/games/:gameId/date-estimate', verifyToken, deleteGameDateEstimate);
router.put('/divisions/:id/playoff-visibility', verifyToken, setDivisionPlayoffVisibility);

export default router;
