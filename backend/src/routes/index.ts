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

// Painel admin — resumo unificado (com filtro de período opcional)
router.get('/painel/resumo', async (req: Request, res: Response) => {
  try {
    const { inicio, fim } = req.query;

    // Filtro de data opcional: aplica nos agendamentos via passeio.data
    const filtroData = inicio && fim
      ? { passeio: { data: { gte: new Date(inicio as string), lte: new Date(fim as string) } } }
      : {};

    const filterAgendamentos = Object.keys(filtroData).length > 0 ? filtroData : {};

    const [totalAgendamentos, totalClientes, realizadosSlot] = await Promise.all([
      prisma.agendamento.count({ where: filterAgendamentos }),
      prisma.clientes.count(),
      prisma.slotAtribuicao.count({
        where: {
          status: 'REALIZADO',
          ...(inicio && fim ? {
            slotPasseio: {
              instancias: {
                some: {
                  data: { gte: new Date(inicio as string), lte: new Date(fim as string) },
                },
              },
            },
          } : {}),
        },
      }),
    ]);

    const totalTuristas = await prisma.agendamento.aggregate({
      where: filterAgendamentos,
      _sum: { acompanhantes: true },
    });
    const totalAgendamentosCount = totalAgendamentos + (totalTuristas._sum.acompanhantes || 0);

    const receita = await prisma.agendamento.findMany({
      where: { status: { not: 'CANCELADO' }, ...filterAgendamentos },
      select: {
        passeio: { select: { preco: true } },
        acompanhantes: true,
      },
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

// Painel — avaliação em cache
router.get('/painel/avaliacao', async (req: Request, res: Response) => {
  try {
    const cache = await prisma.avaliacaoCache.findFirst({
      orderBy: { id: 'desc' },
    });
    res.json({
      avaliacaoMedia: Number(cache?.avaliacaoMedia ?? 0),
      totalAvaliacoes: cache?.totalAvaliacoes ?? 0,
      atualizadaEm: cache?.atualizadaEm ?? null,
    });
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ message: 'Erro ao buscar avaliação' });
  }
});

// Painel — atualizar avaliação manualmente (admin)
router.post('/painel/avaliacao/atualizar', async (req: Request, res: Response) => {
  try {
    const { avaliacaoMedia, totalAvaliacoes } = req.body;
    if (avaliacaoMedia === undefined || totalAvaliacoes === undefined) {
      res.status(400).json({ message: 'avaliacaoMedia e totalAvaliacoes são obrigatórios' });
      return;
    }

    const cache = await prisma.avaliacaoCache.create({
      data: {
        avaliacaoMedia: Number(avaliacaoMedia),
        totalAvaliacoes: Number(totalAvaliacoes),
        atualizadaEm: new Date(),
      },
    });

    res.json({
      avaliacaoMedia: Number(cache.avaliacaoMedia),
      totalAvaliacoes: cache.totalAvaliacoes,
      atualizadaEm: cache.atualizadaEm,
    });
  } catch (error) {
    console.error('Erro ao atualizar avaliação:', error);
    res.status(500).json({ message: 'Erro ao atualizar avaliação' });
  }
});

export default router;
