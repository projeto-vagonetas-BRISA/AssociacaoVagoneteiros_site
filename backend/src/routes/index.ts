import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import passeioRoutes from './passeioRoutes';
import clienteRoutes from './clienteRoutes';
import agendamentoRoutes from './agendamentoRoutes';
import avaliacaoRoutes from './avaliacaoRoutes';
import usuarioRoutes from './usuarioRoutes';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API Vagoneteiros rodando!' });
});

router.use('/auth', authRoutes);
router.use('/passeios', passeioRoutes);
router.use('/clientes', clienteRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/avaliacoes', avaliacaoRoutes);
router.use('/usuarios', usuarioRoutes);

export default router;
