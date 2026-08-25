import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar, atualizarStatus } from '../controllers/passeioController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Listagem pública (agendamento público) — sem auth
router.get('/', listar);
router.get('/:id', buscarPorId);

// Ações administrativas — auth necessária
router.post('/', authMiddleware, criar);
router.put('/:id', authMiddleware, atualizar);
router.delete('/:id', authMiddleware, deletar);
router.patch('/:id/status', authMiddleware, atualizarStatus);

export default router;

