import { Router } from 'express';
import { listar, buscarPorId, criar, atualizar, deletar } from '../controllers/passeioController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/', authMiddleware, listar);
router.get('/:id', authMiddleware, buscarPorId);
router.post('/', authMiddleware, criar);
router.put('/:id', authMiddleware, atualizar);
router.delete('/:id', authMiddleware, deletar);

export default router;
