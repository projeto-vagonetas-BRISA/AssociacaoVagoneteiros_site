import { Router } from 'express';
import { cadastro, login, me } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', cadastro);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export default router;
