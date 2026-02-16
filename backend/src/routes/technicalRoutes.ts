import { Router } from 'express';
import {
    upsertDerivacion,
    createCuadro,
    updateCuadroComponents,
    deleteCuadro,
    upsertVerificaciones,
    uploadCuadroPhoto
} from '../controllers/technicalController';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../controllers/documentController';

const router = Router();

router.use(authenticateToken);

// Derivacion
router.post('/expedientes/:expedienteId/derivacion', upsertDerivacion);

// Cuadros
router.post('/expedientes/:expedienteId/cuadros', createCuadro);
router.put('/cuadros/:cuadroId/components', updateCuadroComponents);
router.delete('/cuadros/:id', deleteCuadro);
// Upload photo for cuadro
router.post('/cuadros/:cuadroId/photos', upload.single('photo'), uploadCuadroPhoto);

// Verificaciones
router.post('/expedientes/:expedienteId/verificaciones', upsertVerificaciones);

export default router;
