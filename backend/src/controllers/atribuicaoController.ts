import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';
import { conflitoService } from '../services/agendamento.service';
import { StatusAtribuicao } from '@prisma/client';

// ─── AUTO-ATRIBUIÇÃO (modelo Uber) ────────────────────────────────

/**
 * POST /atribuicoes/auto-atribuir
 * Vagoneteiro se auto-atribui a uma instância de slot
 */
export async function autoAtribuir(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user!.id;
    const { instanciaId } = req.body;

    if (!instanciaId) {
      res.status(400).json({ message: 'instanciaId é obrigatório' });
      return;
    }

    // Verificar se a instância existe e está disponível
    const instancia = await prisma.slotInstancia.findUnique({
      where: { id: parseInt(instanciaId, 10) },
      include: {
        slotPasseio: {
          include: { _count: { select: { atribuicoes: true } } },
        },
      },
    });

    if (!instancia) {
      res.status(404).json({ message: 'Instância não encontrada' });
      return;
    }

    if (instancia.status === 'CANCELADO' || instancia.status === 'REALIZADO') {
      res.status(400).json({ message: `Instância está ${instancia.status === 'CANCELADO' ? 'cancelada' : 'realizada'}` });
      return;
    }

    // Verificar se a data já passou
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataInstancia = new Date(instancia.data);
    dataInstancia.setHours(0, 0, 0, 0);
    if (dataInstancia < hoje) {
      res.status(400).json({ message: 'Não é possível se atribuir a uma instância passada' });
      return;
    }

    // Verificar capacidade do slot
    const vagasOcupadas = instancia.slotPasseio._count.atribuicoes;
    const vagasRestantes = instancia.slotPasseio.capacidade - vagasOcupadas;
    if (vagasRestantes <= 0) {
      res.status(400).json({ message: 'Slot lotado — todas as vagas já foram preenchidas' });
      return;
    }

    // Verificar se o vagoneteiro já está atribuído a esta instância
    const jaAtribuido = await prisma.slotAtribuicao.findFirst({
      where: {
        vagoneteiroId,
        instanciaId: instancia.id,
        status: { not: 'CANCELADO' },
      },
    });

    if (jaAtribuido) {
      res.status(400).json({ message: 'Você já está atribuído a esta instância' });
      return;
    }

    // Verificar conflito de horário com outras atribuições do vagoneteiro
    const conflitos = await conflitoService.verificarConflitoVagoneteiro(
      vagoneteiroId,
      instancia.data,
      instancia.horaInicio,
      instancia.horaFim
    );

    if (conflitos.length > 0) {
      res.status(409).json({
        message: 'Conflito de horário detectado',
        conflitos: conflitos.map(c => c.mensagem),
      });
      return;
    }

    // Criar atribuição
    const atribuicao = await prisma.slotAtribuicao.create({
      data: {
        slotPasseioId: instancia.slotPasseioId,
        instanciaId: instancia.id,
        vagoneteiroId,
        status: 'ATRIBUIDO',
      },
      include: {
        slotPasseio: {
          select: { id: true, titulo: true, horaInicio: true, horaFim: true },
        },
        instancia: {
          select: { id: true, data: true, horaInicio: true, horaFim: true },
        },
      },
    });

    // Atualizar status da instância se atingir capacidade
    const totalAtribuicoes = await prisma.slotAtribuicao.count({
      where: {
        instanciaId: instancia.id,
        status: 'ATRIBUIDO',
      },
    });

    if (totalAtribuicoes >= instancia.slotPasseio.capacidade) {
      await prisma.slotInstancia.update({
        where: { id: instancia.id },
        data: { status: 'AGENDADO' }, // Mantém AGENDADO mesmo lotado, só impede novas atribuições
      });
    }

    res.status(201).json({
      message: 'Atribuído com sucesso! 🚂',
      atribuicao,
      vagasRestantes: instancia.slotPasseio.capacidade - totalAtribuicoes,
    });
  } catch (error) {
    console.error('Erro ao auto-atribuir:', error);
    res.status(500).json({ message: 'Erro ao se atribuir ao passeio' });
  }
}

/**
 * GET /atribuicoes/minhas
 * Lista atribuições do vagoneteiro logado
 */
export async function minhasAtribuicoes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user!.id;
    const { status, page, limit } = req.query;

    const pagina = Math.max(1, parseInt(page as string) || 1);
    const limite = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pagina - 1) * limite;

    const where: any = { vagoneteiroId };
    if (status) where.status = status as string;

    const [atribuicoes, total] = await Promise.all([
      prisma.slotAtribuicao.findMany({
        where,
        include: {
          slotPasseio: {
            select: {
              id: true,
              titulo: true,
              descricao: true,
              horaInicio: true,
              horaFim: true,
              capacidade: true,
              valor: true,
            },
          },
          instancia: {
            select: { id: true, data: true, horaInicio: true, horaFim: true },
          },
        },
        orderBy: [
          { atribuidoEm: 'desc' },
          { instancia: { data: 'desc' } },
        ],
        skip,
        take: limite,
      }),
      prisma.slotAtribuicao.count({ where }),
    ]);

    // Calcular vagas ocupadas por instância
    const atribuicoesCompletas = await Promise.all(
      atribuicoes.map(async (attr) => {
        const totalVagas = await prisma.slotAtribuicao.count({
          where: {
            instanciaId: attr.instanciaId,
            status: 'ATRIBUIDO',
          },
        });
        return {
          ...attr,
          vagasOcupadas: totalVagas,
        };
      })
    );

    res.json({
      data: atribuicoesCompletas,
      page: pagina,
      limit: limite,
      total,
      totalPages: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Erro ao listar atribuições:', error);
    res.status(500).json({ message: 'Erro ao listar suas atribuições' });
  }
}

/**
 * PATCH /atribuicoes/:id/cancelar
 * Vagoneteiro cancela sua atribuição
 */
export async function cancelarAtribuicao(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user!.id;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const atribuicao = await prisma.slotAtribuicao.findUnique({
      where: { id },
      include: {
        instancia: { select: { data: true } },
      },
    });

    if (!atribuicao) {
      res.status(404).json({ message: 'Atribuição não encontrada' });
      return;
    }

    // Verificar se a atribuição é do vagoneteiro logado
    if (atribuicao.vagoneteiroId !== vagoneteiroId && req.user!.perfil !== 'ADMIN') {
      res.status(403).json({ message: 'Você não pode cancelar a atribuição de outro vagoneteiro' });
      return;
    }

    if (atribuicao.status === 'CANCELADO') {
      res.status(400).json({ message: 'Atribuição já está cancelada' });
      return;
    }

    if (atribuicao.status === 'REALIZADO') {
      res.status(400).json({ message: 'Não é possível cancelar uma atribuição já realizada' });
      return;
    }

    // Verificar se a data já passou
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataInstancia = new Date(atribuicao.instancia!.data);
    dataInstancia.setHours(0, 0, 0, 0);
    if (dataInstancia < hoje) {
      res.status(400).json({ message: 'Não é possível cancelar atribuição de uma data passada' });
      return;
    }

    const atualizada = await prisma.slotAtribuicao.update({
      where: { id },
      data: {
        status: 'CANCELADO',
        canceladoEm: new Date(),
      },
    });

    res.json({ message: 'Atribuição cancelada', atribuicao: atualizada });
  } catch (error) {
    console.error('Erro ao cancelar atribuição:', error);
    res.status(500).json({ message: 'Erro ao cancelar atribuição' });
  }
}

/**
 * PATCH /atribuicoes/:id/realizar
 * Marca atribuição como realizada (admin/vagoneteiro)
 */
export async function realizarAtribuicao(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const atribuicao = await prisma.slotAtribuicao.findUnique({
      where: { id },
    });

    if (!atribuicao) {
      res.status(404).json({ message: 'Atribuição não encontrada' });
      return;
    }

    if (atribuicao.status === 'REALIZADO') {
      res.status(400).json({ message: 'Atribuição já está como realizada' });
      return;
    }

    const atualizada = await prisma.slotAtribuicao.update({
      where: { id },
      data: { status: 'REALIZADO' },
    });

    // Verificar se todas as atribuições da instância foram realizadas
    if (atualizada.instanciaId) {
      const pendentes = await prisma.slotAtribuicao.count({
        where: {
          instanciaId: atualizada.instanciaId,
          status: 'ATRIBUIDO',
        },
      });

      if (pendentes === 0) {
        await prisma.slotInstancia.update({
          where: { id: atualizada.instanciaId },
          data: { status: 'REALIZADO' },
        });
      }
    }

    res.json({ message: 'Atribuição marcada como realizada ✅', atribuicao: atualizada });
  } catch (error) {
    console.error('Erro ao realizar atribuição:', error);
    res.status(500).json({ message: 'Erro ao marcar atribuição como realizada' });
  }
}

/**
 * GET /atribuicoes/feed
 * Feed estilo Uber: instâncias disponíveis para auto-atribuição
 */
export async function feedDisponiveis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user?.id;
    const { data } = req.query;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = data
      ? new Date(data as string)
      : new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Buscar instâncias disponíveis com slots ativos
    const instancias = await prisma.slotInstancia.findMany({
      where: {
        data: { gte: hoje, lte: dataFim },
        status: 'AGENDADO',
        slotPasseio: {
          status: 'DISPONIVEL',
        },
      },
      include: {
        slotPasseio: {
          select: {
            id: true,
            titulo: true,
            descricao: true,
            horaInicio: true,
            horaFim: true,
            duracaoMinutos: true,
            capacidade: true,
            valor: true,
            diaSemana: true,
            usuario: {
              select: { id: true, name: true },
            },
            _count: { select: { atribuicoes: true } },
          },
        },
        atribuicoes: {
          where: { status: 'ATRIBUIDO' },
          select: { id: true, vagoneteiroId: true },
        },
      },
      orderBy: [{ data: 'asc' }, { slotPasseio: { horaInicio: 'asc' } }],
    });

    // Processar: calcular vagas e verificar se o vagoneteiro já está atribuído
    const feed = instancias.map((inst) => {
      const vagasOcupadas = inst.atribuicoes.length;
      const vagasDisponiveis = inst.slotPasseio.capacidade - vagasOcupadas;
      const jaPeguei = vagoneteiroId
        ? inst.atribuicoes.some((a) => a.vagoneteiroId === vagoneteiroId)
        : false;

      return {
        instanciaId: inst.id,
        data: inst.data,
        diaSemana: inst.slotPasseio.diaSemana,
        slot: {
          id: inst.slotPasseio.id,
          titulo: inst.slotPasseio.titulo,
          descricao: inst.slotPasseio.descricao,
          horario: `${inst.slotPasseio.horaInicio} - ${inst.slotPasseio.horaFim}`,
          duracao: inst.slotPasseio.duracaoMinutos,
          valor: inst.slotPasseio.valor,
          vagoneteiro: inst.slotPasseio.usuario,
        },
        vagas: {
          total: inst.slotPasseio.capacidade,
          ocupadas: vagasOcupadas,
          disponiveis: vagasDisponiveis,
        },
        jaPeguei,
        podePegar: vagasDisponiveis > 0 && !jaPeguei,
      };
    });

    // Agrupar por data
    const agrupado: Record<string, typeof feed> = {};
    for (const item of feed) {
      const chave = new Date(item.data).toISOString().split('T')[0];
      if (!agrupado[chave]) agrupado[chave] = [];
      agrupado[chave].push(item);
    }

    res.json({
      total: feed.length,
      dias: Object.keys(agrupado).length,
      data: agrupado,
      flat: feed,
    });
  } catch (error) {
    console.error('Erro ao carregar feed:', error);
    res.status(500).json({ message: 'Erro ao carregar feed de passeios' });
  }
}
