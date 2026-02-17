import { Router } from 'express';
import { register, login, initAdmin } from '../controllers/authController';
import { fixDb } from '../controllers/deployController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/init-admin', initAdmin);
router.get('/fix-db', fixDb); // New diagnostic route

export default router;
