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
import prisma from '../lib/prisma';

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

// Painel admin — resumo unificado
router.get('/painel/resumo', async (req: Request, res: Response) => {
  try {
    const [totalAgendamentos, totalClientes, totalAvaliacoes, realizadosSlot] = await Promise.all([
      prisma.agendamento.count(),
      prisma.cliente.count(),
      prisma.avaliacao.count(),
      prisma.slotAtribuicao.count({ where: { status: 'REALIZADO' } }),
    ]);

    const totalTuristas = await prisma.agendamento.aggregate({
      _sum: { acompanhantes: true },
    });
    const totalAgendamentosCount = totalAgendamentos + (totalTuristas._sum.acompanhantes || 0);

    const receita = await prisma.agendamento.findMany({
      where: { status: { not: 'CANCELADO' } },
      select: { passeio: { select: { preco: true } }, acompanhantes: true },
    });
    const receitaEstimada = receita.reduce((s, a) => s + Number(a.passeio.preco) * (1 + (a.acompanhantes || 0)), 0);

    res.json({
      totalTuristas: totalAgendamentosCount,
      passeiosRealizados: realizadosSlot,
      receitaEstimada,
      totalClientes,
    });
  } catch (error) {
    console.error('Erro ao buscar resumo do painel:', error);
    res.status(500).json({ message: 'Erro ao buscar resumo do painel' });
  }
});

export default router;
