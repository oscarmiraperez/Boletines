import { Router } from 'express';
import { upload, uploadSignature, uploadDNI, generateAuthDoc, generateMTDDoc, generateSchematicDoc } from '../controllers/documentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/expedientes/:expedienteId/signature', upload.single('signature'), uploadSignature);
router.post('/expedientes/:expedienteId/dni', upload.single('dni'), uploadDNI);
router.post('/expedientes/:expedienteId/authorization/generate', generateAuthDoc);
router.post('/expedientes/:expedienteId/mtd/generate', generateMTDDoc);
router.post('/expedientes/:expedienteId/schematic/generate', generateSchematicDoc);

export default router;
