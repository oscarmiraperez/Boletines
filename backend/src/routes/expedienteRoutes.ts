import { Router } from 'express';
import {
    getExpedientes,
    getExpedienteById,
    createExpediente,
    updateExpediente,
    deleteExpediente
} from '../controllers/expedienteController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken); // All routes require auth

router.get('/', getExpedientes);
router.get('/:id', getExpedienteById);
router.post('/', createExpediente);
router.put('/:id', updateExpediente);
router.delete('/:id', deleteExpediente);

export default router;
