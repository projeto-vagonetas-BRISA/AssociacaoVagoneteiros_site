import { Router } from 'express';
import { listar, buscarPorId, criar, atualizarStatus, deletar } from '../controllers/agendamentoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, listar);
router.get('/:id', authMiddleware, buscarPorId);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.patch('/:id/status', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizarStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), deletar);

export default router;
