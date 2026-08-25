import { Router } from 'express';
import {
  autoAtribuir,
  minhasAtribuicoes,
  cancelarAtribuicao,
  realizarAtribuicao,
  feedDisponiveis,
} from '../controllers/atribuicaoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Feed público de instâncias disponíveis
router.get('/feed', feedDisponiveis);

// Auto-atribuição (vagoneteiro)
router.post('/auto-atribuir', authMiddleware, autoAtribuir);

// Minhas atribuições (vagoneteiro)
router.get('/minhas', authMiddleware, minhasAtribuicoes);

// Cancelar / realizar (vagoneteiro ou admin)
router.patch('/:id/cancelar', authMiddleware, cancelarAtribuicao);
router.patch('/:id/realizar', authMiddleware, realizarAtribuicao);

export default router;
