import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getSeasons,
  getDivisions,
  getTournaments,
  getDivisionDetail,
  getDivisionStandings,
  getDivisionGames,
  getDivisionNearestGames,
  getHomeNearestGames,
  getDivisionPlayoff,
  getDivisionNominations,
  getDivisionTeams,
  getDivisionReserveGoalies,
  getTeamDetail,
  setGameDateEstimate,
  deleteGameDateEstimate,
  setDivisionPlayoffVisibility,
  setDivisionDisplaySettings,
} from '../controllers/ChampionshipController.js';

const router = Router();

router.get('/nearest-games', getHomeNearestGames);
router.get('/seasons', getSeasons);
router.get('/divisions', getDivisions);
router.get('/tournaments', getTournaments);

router.get('/divisions/:id', getDivisionDetail);
router.get('/divisions/:id/standings', getDivisionStandings);
router.get('/divisions/:id/games', getDivisionGames);
router.get('/divisions/:id/nearest-games', getDivisionNearestGames);
router.get('/divisions/:id/playoff', getDivisionPlayoff);
router.get('/divisions/:id/nominations', getDivisionNominations);
router.get('/divisions/:id/teams', getDivisionTeams);
router.get('/divisions/:id/reserve-goalies', getDivisionReserveGoalies);
router.get('/teams/:tournamentTeamId', getTeamDetail);

router.put('/games/:gameId/date-estimate', verifyToken, setGameDateEstimate);
router.delete('/games/:gameId/date-estimate', verifyToken, deleteGameDateEstimate);
router.put('/divisions/:id/playoff-visibility', verifyToken, setDivisionPlayoffVisibility);
router.put('/divisions/:id/display-settings', verifyToken, setDivisionDisplaySettings);

export default router;
