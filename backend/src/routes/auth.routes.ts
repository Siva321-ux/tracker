import { Router } from 'express';
import { register, login, getMe, refreshToken } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.get('/me', authenticateToken, getMe);
router.post('/refresh', authenticateToken, refreshToken);

export default router;
