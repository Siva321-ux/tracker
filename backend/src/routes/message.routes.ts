import { Router } from 'express';
import {
  getPublicMessages,
  sendPublicMessage,
  getConversations,
  getPrivateMessages,
  sendPrivateMessage
} from '../controllers/message.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/team/:id', getPublicMessages);
router.post('/team/:id', sendPublicMessage);

router.get('/private/conversations', getConversations);
router.get('/private/user/:userId', getPrivateMessages);
router.post('/private', sendPrivateMessage);

export default router;
