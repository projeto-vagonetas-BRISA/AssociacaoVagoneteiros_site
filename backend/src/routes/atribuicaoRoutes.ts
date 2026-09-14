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

// feed público de instâncias disponíveis
router.get('/feed', feedDisponiveis);

// auto-atribuição (vagoneteiro)
router.post('/auto-atribuir', authMiddleware, autoAtribuir);

// minhas atribuições (vagoneteiro)
router.get('/minhas', authMiddleware, minhasAtribuicoes);

// cancelar / realizar (vagoneteiro ou admin)
router.patch('/:id/cancelar', authMiddleware, cancelarAtribuicao);
router.patch('/:id/realizar', authMiddleware, realizarAtribuicao);

export default router;
