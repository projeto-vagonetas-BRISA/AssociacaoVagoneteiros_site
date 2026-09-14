import { Router } from 'express';
import { listar, buscarPorId, buscarPorDocumento, criar, atualizar, deletar } from '../controllers/clienteController';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';

const router = Router();

// rota pública de busca por documento (cpf/cnpj) — antes de /:id pra evitar conflito
router.get('/busca/:documento', buscarPorDocumento);

// qualquer usuário autenticado pode listar e buscar clientes
router.get('/', listar);
router.get('/:id', buscarPorId);

// apenas admin e redator podem criar/editar/deletar
router.post('/', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), criar);
router.put('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), atualizar);
router.delete('/:id', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), deletar);

export default router;
