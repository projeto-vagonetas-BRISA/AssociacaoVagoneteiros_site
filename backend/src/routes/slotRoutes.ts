import { Router } from 'express';
import {
  criar, listar, buscarPorId, atualizar, cancelar,
  expandir, listarInstancias, gerarLote,
  listarDisponiveis,
} from '../controllers/slotController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Rotas públicas
router.get('/disponiveis', listarDisponiveis);
router.get('/', listar);
router.get('/:id', buscarPorId);
router.get('/:id/instancias', listarInstancias);

// Rotas autenticadas (admin/redator)
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), cancelar);
router.post('/:id/expandir', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), expandir);
router.post('/lotes/gerar', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), gerarLote);

export default router;
