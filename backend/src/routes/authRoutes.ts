import { Router } from 'express';
import { login, register, initAdmin } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/init-admin', initAdmin);

export default router;
