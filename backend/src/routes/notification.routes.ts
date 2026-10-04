import { Router } from 'express';
import { getNotifications, markNotificationAsRead } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);

export default router;
