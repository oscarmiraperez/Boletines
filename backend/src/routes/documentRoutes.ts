import { Router } from 'express';
import { upload, uploadSignature, uploadDNI, generateAuthDoc, generateMTDDoc } from '../controllers/documentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/expedientes/:expedienteId/signature', upload.single('signature'), uploadSignature);
router.post('/expedientes/:expedienteId/dni', upload.single('dni'), uploadDNI);
router.post('/expedientes/:expedienteId/authorization/generate', generateAuthDoc);
router.post('/expedientes/:expedienteId/mtd/generate', generateMTDDoc);

export default router;
