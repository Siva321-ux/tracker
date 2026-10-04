import { Router } from 'express';
import { getOfflineRegions, createOfflineRegion } from '../controllers/offlineRegion.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getOfflineRegions);
router.post('/', createOfflineRegion);

export default router;
