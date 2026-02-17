import { Router } from 'express';
import {
    getExpedientes,
    getExpedienteById,
    createExpediente,
    updateExpediente,
    deleteExpediente
} from '../controllers/expedienteController';
import { authenticateToken } from '../middleware/authMiddleware';

import { upload } from '../controllers/documentController';
import { uploadExpedientePhoto, deleteExpedientePhoto, getExpedientePhotos } from '../controllers/photoController';

const router = Router();

router.use(authenticateToken); // All routes require auth

router.get('/', getExpedientes);
router.get('/:id', getExpedienteById);
router.post('/', createExpediente);
router.put('/:id', updateExpediente);
router.delete('/:id', deleteExpediente);

// Photo Routes
router.post('/:expedienteId/photos', upload.single('photo'), uploadExpedientePhoto);
router.delete('/:id/photos/:photoId', deleteExpedientePhoto);
router.get('/:expedienteId/photos', getExpedientePhotos);

export default router;
