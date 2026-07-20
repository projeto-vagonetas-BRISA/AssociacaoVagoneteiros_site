import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import passeioRoutes from './passeioRoutes';
import clienteRoutes from './clienteRoutes';
import agendamentoRoutes from './agendamentoRoutes';
import avaliacaoRoutes from './avaliacaoRoutes';
import usuarioRoutes from './usuarioRoutes';
import slotRoutes from './slotRoutes';
import atribuicaoRoutes from './atribuicaoRoutes';
import { listarFotosGaleria, servirImagemGaleria } from '../controllers/galeriaController';
import { metricas, picosDemanda, faturamento } from '../controllers/dashboardController';

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
router.use('/slots', slotRoutes);
router.use('/atribuicoes', atribuicaoRoutes);

// Dashboard
router.get('/dashboard/metricas', metricas);
router.get('/dashboard/picos', picosDemanda);
router.get('/dashboard/faturamento', faturamento);

router.get('/galeria/fotos', listarFotosGaleria);
router.get('/galeria/imagem/:fileId', servirImagemGaleria);

router.get('/galeria/fotos', listarFotosGaleria);
router.get('/galeria/imagem/:fileId', servirImagemGaleria);

export default router;
