import { Router } from 'express';
import { getTeams, createTeam, getTeamDetails, addTeamMember } from '../controllers/team.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getTeams);
router.post('/', createTeam);
router.get('/:id', getTeamDetails);
router.post('/:id/members', addTeamMember);

export default router;
