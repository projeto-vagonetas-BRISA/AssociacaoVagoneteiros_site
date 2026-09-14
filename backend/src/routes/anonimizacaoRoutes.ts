import { Router } from 'express';
import { anonimizar, buscar } from '../controllers/anonimizacaoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// rotas privativas do admin (lgpd — anonimização de dados pessoais)
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), anonimizar);
router.get('/buscar', authMiddleware, roleMiddleware(['ADMIN']), buscar);

export default router;
