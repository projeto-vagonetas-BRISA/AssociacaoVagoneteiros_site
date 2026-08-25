import { Router } from 'express';
import { criarSuspensao, removerSuspensao, listarSuspensoes } from '../controllers/suspensaoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Rotas privativas do ADMIN (suspensão de atividades)
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), listarSuspensoes);
router.post('/', authMiddleware, roleMiddleware(['ADMIN']), criarSuspensao);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), removerSuspensao);

export default router;
