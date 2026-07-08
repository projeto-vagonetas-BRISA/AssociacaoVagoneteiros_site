import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/avaliacaoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', listar);
router.get('/:id', buscarPorId);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), deletar);

export default router;
