import { Router } from 'express';
import { saveLocation, getDeviceLocations, getLatestTeamLocations } from '../controllers/location.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.post('/', saveLocation);
router.get('/device/:id', getDeviceLocations);
router.get('/team/:id/latest', getLatestTeamLocations);

export default router;
