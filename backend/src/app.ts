import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import passeioRoutes from './routes/passeioRoutes';
import clienteRoutes from './routes/clienteRoutes';
import agendamentoRoutes from './routes/agendamentoRoutes';
import avaliacaoRoutes from './routes/avaliacaoRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import slotRoutes from './routes/slotRoutes';
import atribuicaoRoutes from './routes/atribuicaoRoutes';
import suspensaoRoutes from './routes/suspensaoRoutes';
import anonimizacaoRoutes from './routes/anonimizacaoRoutes';
import { listarFotosGaleria, servirImagemGaleria } from './controllers/galeriaController';
import { metricas, picosDemanda, faturamento } from './controllers/dashboardController';
import prisma from './lib/prisma';
import { parseFiltroData } from './utils/filtroData';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
}));

// ─── Rotas da API ──────────────────────────────────────────────
app.get('/health', (req: Request, res: Response) => {
    res.json({ message: 'API Vagoneteiros rodando!' });
});

app.use('/auth', authRoutes);
app.use('/passeios', passeioRoutes);
app.use('/clientes', clienteRoutes);
app.use('/agendamentos', agendamentoRoutes);
app.use('/avaliacoes', avaliacaoRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/slots', slotRoutes);
app.use('/atribuicoes', atribuicaoRoutes);
app.use('/suspensoes', suspensaoRoutes);
app.use('/anonimizacao', anonimizacaoRoutes);

// Dashboard
app.get('/dashboard/metricas', metricas);
app.get('/dashboard/picos', picosDemanda);
app.get('/dashboard/faturamento', faturamento);

// Galeria
app.get('/galeria/fotos', listarFotosGaleria);
app.get('/galeria/imagem/:fileId', servirImagemGaleria);

// Painel admin
app.get('/painel/resumo', async (req: Request, res: Response) => {
  try {
    const { inicio, fim } = req.query;
    const filtroDate = parseFiltroData(inicio as string, fim as string);
    const filtroData = filtroDate ? { passeio: { data: filtroDate } } : {};
    const filterAgendamentos = Object.keys(filtroData).length > 0 ? filtroData : {};

    const [totalAgendamentos, totalClientes, realizadosSlot] = await Promise.all([
      prisma.agendamento.count({ where: filterAgendamentos }),
      prisma.clientes.count(),
      prisma.slotAtribuicao.count({
        where: {
          status: 'REALIZADO',
          ...(filtroDate ? {
            slotPasseio: {
              instancias: { some: { data: filtroDate } },
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

app.get('/painel/avaliacao', async (req: Request, res: Response) => {
  try {
    const cache = await prisma.avaliacaoCache.findFirst({ orderBy: { id: 'desc' } });
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

app.post('/painel/avaliacao/atualizar', async (req: Request, res: Response) => {
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

// ─── Frontend ──────────────────────────────────────────────
const frontendDist = path.resolve(process.cwd(), '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Fallback SPA
app.use((req: Request, res: Response, next: NextFunction) => {
  if (path.extname(req.path)) return next();
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Middleware global de erros
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
  });
});

export default app;
