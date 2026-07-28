import { Router } from 'express';
import { cadastro, cadastroAdmin, login, me } from '../controllers/authController';
import { esqueciSenha, redefinirSenha } from '../controllers/resetSenhaController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', cadastro);
router.post('/register/admin', authMiddleware, roleMiddleware(['ADMIN']), cadastroAdmin);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.post('/esqueci-senha', esqueciSenha);
router.post('/redefinir-senha', redefinirSenha);

export default router;
