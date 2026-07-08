import { Router } from 'express';
import { listar, buscarPorId, criar, agendarPublico, atualizarStatus, deletar } from '../controllers/agendamentoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Rota pública — qualquer pessoa pode agendar
router.post('/publico', agendarPublico);

// Rotas administrativas
router.get('/', authMiddleware, listar);
router.get('/:id', authMiddleware, buscarPorId);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.patch('/:id/status', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizarStatus);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), deletar);

export default router;
