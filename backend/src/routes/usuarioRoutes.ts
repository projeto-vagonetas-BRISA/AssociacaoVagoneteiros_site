import { Router } from 'express';
import { listar, listarVagoneteiros, buscarPorId, atualizarPerfil, deletar } from '../controllers/usuarioController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Apenas ADMIN pode gerenciar usuários
router.get('/', authMiddleware, roleMiddleware(['ADMIN']), listar);

// Listar vagoneteiros com paginação (admin e redator)
router.get('/vagoneteiros', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), listarVagoneteiros);
router.get('/:id', authMiddleware, roleMiddleware(['ADMIN']), buscarPorId);
router.patch('/:id/perfil', authMiddleware, roleMiddleware(['ADMIN']), atualizarPerfil);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN']), deletar);

export default router;
