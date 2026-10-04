import { Router } from 'express';
import { getDevices, registerDevice, getDeviceById } from '../controllers/device.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

router.get('/', getDevices);
router.post('/', registerDevice);
router.get('/:id', getDeviceById);

export default router;
