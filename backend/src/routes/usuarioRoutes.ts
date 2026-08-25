import { Router } from 'express';
import { listar, listarVagoneteiros, buscarPorId, atualizar, atualizarPerfil, alternarAtivo, deletar } from '../controllers/usuarioController';
import { authMiddleware, roleMiddleware, adminOrSelfMiddleware } from '../middlewares/auth';

const router = Router();

// Apenas ADMIN pode gerenciar usuários
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), listar);

// Listar vagoneteiros com paginação (admin e redator) — antes de /:id
router.get('/vagoneteiros', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), listarVagoneteiros);

// Alternar ativo/inativo (admin)
router.patch('/vagoneteiros/:id/ativo', authMiddleware, roleMiddleware(['ADMIN']), alternarAtivo);

router.get('/:id', authMiddleware, adminOrSelfMiddleware, buscarPorId);
router.put('/:id', authMiddleware, adminOrSelfMiddleware, atualizar);
router.patch('/:id/perfil', authMiddleware, roleMiddleware(['ADMIN']), atualizarPerfil);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), deletar);

export default router;

