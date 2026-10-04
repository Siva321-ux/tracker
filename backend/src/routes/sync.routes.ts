import { Router } from 'express';
import { processSyncQueue } from '../controllers/sync.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.post('/', processSyncQueue);

export default router;
