import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/clienteController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Qualquer usuário autenticado pode listar e buscar clientes
router.get('/', authMiddleware, listar);
router.get('/:id', authMiddleware, buscarPorId);

// Apenas ADMIN e REDATOR podem criar/editar/deletar
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), deletar);

export default router;
