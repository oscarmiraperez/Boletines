import { Router } from 'express';
import { exportData, importData } from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

router.get('/export', exportData);
router.post('/import', importData);

export default router;
