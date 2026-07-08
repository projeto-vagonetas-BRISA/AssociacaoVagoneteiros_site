import { Router } from 'express';
import { cadastro, cadastroAdmin, login, me } from '../controllers/authController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', cadastro);
router.post('/register/admin', authMiddleware, roleMiddleware(['ADMIN']), cadastroAdmin);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export default router;
