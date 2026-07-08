import { Router } from 'express';
import { listar, listarVagoneteiros, buscarPorId, atualizarPerfil, alternarAtivo, deletar } from '../controllers/usuarioController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Apenas ADMIN pode gerenciar usuários
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), listar);

// Listar vagoneteiros com paginação (admin e redator) — antes de /:id
router.get('/vagoneteiros', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), listarVagoneteiros);

// Alternar ativo/inativo (admin)
router.patch('/vagoneteiros/:id/ativo', authMiddleware, roleMiddleware(['ADMIN']), alternarAtivo);

router.get('/:id', authMiddleware, roleMiddleware(['ADMIN']), buscarPorId);
router.patch('/:id/perfil', authMiddleware, roleMiddleware(['ADMIN']), atualizarPerfil);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), deletar);

export default router;
