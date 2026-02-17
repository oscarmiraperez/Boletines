
import { Router } from 'express';
import {
    getEsquemas,
    getEsquemaById,
    createEsquema,
    updateEsquema,
    deleteEsquema,
    generateEsquemaPDF
} from '../controllers/esquemaController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getEsquemas);
router.get('/:id', getEsquemaById);
router.post('/', createEsquema);
router.put('/:id', updateEsquema);
router.delete('/:id', deleteEsquema);
router.post('/:id/generate', generateEsquemaPDF);

export default router;
