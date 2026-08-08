import { Router } from 'express';
import { listar, buscarPorId, criar, agendarPublico, vagasDisponiveis, consultaPorDocumento, atualizarStatus, deletar, cancelarPublico, cancelarEmMassa } from '../controllers/agendamentoController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// Rotas públicas
router.get('/vagas-disponiveis', vagasDisponiveis);
router.post('/publico', agendarPublico);
router.get('/consulta/:id/:documento', consultaPorDocumento);
router.post('/cancelar/:id', cancelarPublico);

// Rotas administrativas
router.get('/', authMiddleware, listar);
router.get('/:id', authMiddleware, buscarPorId);
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.patch('/:id/status', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizarStatus);
// Cancelamento em massa — privativo do ADMIN
router.post('/cancelar-em-massa', authMiddleware, roleMiddleware(['ADMIN']), cancelarEmMassa);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), deletar);

export default router;
