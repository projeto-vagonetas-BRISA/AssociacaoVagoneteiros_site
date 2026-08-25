import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';
import { conflitoService } from '../services/agendamento.service';
import * as atribuicaoService from '../services/atribuicao.service';
import { StatusAtribuicao, Prisma } from '@prisma/client';
import {
  parseIdRota,
  validarDataNaoPassada,
  instanciaImpedeAtribuicao,
  mensagemInstanciaIndisponivel,
  calcularPaginacao,
  contarPessoasAgendadas,
  agruparPorData,
  formatarDataLocal,
} from '../utils/atribuicaoValidation';

/**
 * POST /atribuicoes/auto-atribuir
 * Vagoneteiro se auto-atribui a uma instância de slot (modelo Uber).
 */
export async function autoAtribuir(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user!.id;
    const { instanciaId } = req.body;

    if (!instanciaId) {
      res.status(400).json({ message: 'instanciaId é obrigatório' });
      return;
    }

    const instancia = await buscarInstanciaElegivel(instanciaId, res);
    if (!instancia) return;

    const erro = await validarPodeAutoAtribuir(instancia, vagoneteiroId);
    if (erro) {
      res.status(erro.status).json(erro.body);
      return;
    }

    const conflito = await validarConflitoDeHorario(instancia, vagoneteiroId);
    if (conflito) {
      res.status(409).json(conflito);
      return;
    }

    const atribuicao = await criarAtribuicao(instancia, vagoneteiroId);
    await marcarInstanciaAgendada(instancia.id);
    await atribuicaoService.sincronizarAposAtribuicao({
      instanciaId: instancia.id,
      vagoneteiroId,
      valor: instancia.slotPasseio.valor,
      capacidade: instancia.slotPasseio.capacidade,
      data: instancia.data,
      horaInicio: instancia.horaInicio,
    });

    res.status(201).json({
      message: 'Atribuído com sucesso! 🚂',
      atribuicao,
      vagasRestantes: 0,
    });
  } catch (error) {
    console.error('Erro ao auto-atribuir:', error);
    res.status(500).json({ message: 'Erro ao se atribuir ao passeio' });
  }
}

// ─── helpers de autoAtribuir ─────────────────────────────────────

/** Busca a instância e valida que existe e está em status atribuível. */
async function buscarInstanciaElegivel(instanciaId: unknown, res: Response) {
  const instancia = await prisma.slotInstancia.findUnique({
    where: { id: parseInt(instanciaId as string, 10) },
    include: {
      slotPasseio: {
        include: { _count: { select: { atribuicoes: true } } },
      },
    },
  });

  if (!instancia) {
    res.status(404).json({ message: 'Instância não encontrada' });
    return null;
  }

  if (instanciaImpedeAtribuicao(instancia.status)) {
    res.status(400).json({ message: mensagemInstanciaIndisponivel(instancia.status) });
    return null;
  }

  return instancia;
}

/**
 * Valida as regras de elegibilidade para auto-atribuição:
 * data não passada, sem vagoneteiro dono, vagoneteiro não re-atribuído,
 * e sem atribuição pendente em outro passeio.
 */
async function validarPodeAutoAtribuir(
  instancia: NonNullable<Awaited<ReturnType<typeof buscarInstanciaElegivel>>>,
  vagoneteiroId: number,
): Promise<{ status: number; body: Record<string, unknown> } | null> {
  if (!validarDataNaoPassada(instancia.data).ok) {
    return { status: 400, body: { message: 'Não é possível se atribuir a uma instância passada' } };
  }

  const totalAtribuicoes = await prisma.slotAtribuicao.count({
    where: {
      instanciaId: instancia.id,
      status: { in: ['ATRIBUIDO', 'REALIZADO'] },
    },
  });

  if (totalAtribuicoes >= 1) {
    return { status: 400, body: { message: 'Este passeio já foi pego por outro vagoneteiro' } };
  }

  const jaAtribuido = await prisma.slotAtribuicao.findFirst({
    where: {
      vagoneteiroId,
      instanciaId: instancia.id,
      status: { not: 'CANCELADO' },
    },
  });

  if (jaAtribuido) {
    return { status: 400, body: { message: 'Você já está atribuído a esta instância' } };
  }

  // Regra: enquanto estiver ATRIBUIDO a um passeio pendente, deve concluí-lo antes.
  const pendente = await prisma.slotAtribuicao.findFirst({
    where: {
      vagoneteiroId,
      status: 'ATRIBUIDO',
      instanciaId: { not: instancia.id },
    },
    select: {
      id: true,
      instancia: { select: { data: true, horaInicio: true } },
      slotPasseio: { select: { titulo: true } },
    },
  });

  if (pendente) {
    const tituloPendente = pendente.slotPasseio?.titulo || 'um passeio';
    const dataPendente = formatarDataLocal(pendente.instancia?.data);
    return {
      status: 409,
      body: {
        message: `Você já está atribuído a ${tituloPendente}${dataPendente ? ` (${dataPendente})` : ''}. Conclua-o antes de se atribuir a um novo passeio.`,
        atribuicaoPendenteId: pendente.id,
      },
    };
  }

  return null;
}

/** Verifica conflito de horário com outras atribuições do vagoneteiro. */
async function validarConflitoDeHorario(
  instancia: NonNullable<Awaited<ReturnType<typeof buscarInstanciaElegivel>>>,
  vagoneteiroId: number,
) {
  const conflitos = await conflitoService.verificarConflitoVagoneteiro(
    vagoneteiroId,
    instancia.data,
    instancia.horaInicio,
    instancia.horaFim,
  );

  if (conflitos.length > 0) {
    return {
      message: 'Conflito de horário detectado',
      conflitos: conflitos.map((c) => c.mensagem),
    };
  }
  return null;
}

/** Cria a atribuição e retorna com dados do slot/instância. */
async function criarAtribuicao(
  instancia: NonNullable<Awaited<ReturnType<typeof buscarInstanciaElegivel>>>,
  vagoneteiroId: number,
) {
  return prisma.slotAtribuicao.create({
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
}

/** Marca a instância como AGENDADO (capacidade de 1 vagoneteiro atingida). */
async function marcarInstanciaAgendada(instanciaId: number) {
  await prisma.slotInstancia.update({
    where: { id: instanciaId },
    data: { status: 'AGENDADO' },
  });
}

/**
 * GET /atribuicoes/minhas
 * Lista atribuições do vagoneteiro logado, com vagas ocupadas por passeio.
 */
export async function minhasAtribuicoes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user!.id;
    const { status } = req.query;
    const { pagina, limite, skip } = calcularPaginacao(req.query.page, req.query.limit);

    const where: Prisma.SlotAtribuicaoWhereInput = { vagoneteiroId };
    if (status && Object.values(StatusAtribuicao).includes(status as StatusAtribuicao)) {
      where.status = status as StatusAtribuicao;
    }

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

    const atribuicoesCompletas = await Promise.all(
      atribuicoes.map(async (attr) => {
        const vagasOcupadas = await atribuicaoService.contarVagasOcupadasDoPasseio(attr.instanciaId);
        return { ...attr, vagasOcupadas };
      }),
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
 * Vagoneteiro (ou admin) cancela sua atribuição.
 */
export async function cancelarAtribuicao(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const vagoneteiroId = req.user!.id;
    const id = parseIdRota(req.params.id);

    if (id === null) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const atribuicao = await prisma.slotAtribuicao.findUnique({
      where: { id },
      include: {
        instancia: {
          select: {
            data: true,
            horaInicio: true,
            slotPasseio: { select: { capacidade: true } },
          },
        },
      },
    });

    if (!atribuicao) {
      res.status(404).json({ message: 'Atribuição não encontrada' });
      return;
    }

    const podeCancelar = atribuicao.vagoneteiroId === vagoneteiroId || req.user!.perfil === 'ADMIN';
    if (!podeCancelar) {
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

    if (validarDataNaoPassada(atribuicao.instancia!.data).ok === false) {
      res.status(400).json({ message: 'Não é possível cancelar atribuição de uma data passada' });
      return;
    }

    const atualizada = await prisma.slotAtribuicao.update({
      where: { id },
      data: { status: 'CANCELADO', canceladoEm: new Date() },
    });

    if (atribuicao.instancia) {
      await atribuicaoService.sincronizarAposCancelamento({
        instanciaId: atribuicao.instanciaId,
        capacidadeSlot: atribuicao.instancia.slotPasseio.capacidade,
      });
    }

    res.json({ message: 'Atribuição cancelada', atribuicao: atualizada });
  } catch (error) {
    console.error('Erro ao cancelar atribuição:', error);
    res.status(500).json({ message: 'Erro ao cancelar atribuição' });
  }
}

/**
 * PATCH /atribuicoes/:id/realizar
 * Marca atribuição como realizada (admin/vagoneteiro) e propaga ao passeio público.
 */
export async function realizarAtribuicao(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = parseIdRota(req.params.id);

    if (id === null) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const atribuicao = await prisma.slotAtribuicao.findUnique({
      where: { id },
      include: {
        instancia: { select: { data: true, horaInicio: true } },
      },
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

    if (atualizada.instanciaId) {
      await marcarInstanciaSeCompleta(atualizada.instanciaId);
    }

    if (atribuicao.instancia) {
      await atribuicaoService.sincronizarAposRealizacao({
        instanciaId: atribuicao.instanciaId,
        vagoneteiroId: atribuicao.vagoneteiroId,
        data: atribuicao.instancia.data,
        horaInicio: atribuicao.instancia.horaInicio,
      });
    }

    res.json({ message: 'Atribuição e passeio marcados como realizados ✅', atribuicao: atualizada });
  } catch (error) {
    console.error('Erro ao realizar atribuição:', error);
    res.status(500).json({ message: 'Erro ao marcar atribuição como realizada' });
  }
}

/** Marca a instância como REALIZADO quando não há mais atribuições ATRIBUIDO. */
async function marcarInstanciaSeCompleta(instanciaId: number) {
  const pendentes = await prisma.slotAtribuicao.count({
    where: { instanciaId, status: 'ATRIBUIDO' },
  });

  if (pendentes === 0) {
    await prisma.slotInstancia.update({
      where: { id: instanciaId },
      data: { status: 'REALIZADO' },
    });
  }
}

/**
 * GET /atribuicoes/feed
 * Feed estilo Uber: instâncias ainda sem vagoneteiro, disponíveis para auto-atribuição.
 */
export async function feedDisponiveis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { data } = req.query;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataFim = data ? new Date(data as string) : fimDoMesAtual(hoje);

    const instancias = await prisma.slotInstancia.findMany({
      where: {
        data: { gte: hoje, lte: dataFim },
        status: 'AGENDADO',
        slotPasseio: { status: 'DISPONIVEL' },
      },
      include: {
        slotPasseio: {
          select: {
            id: true, titulo: true, descricao: true,
            horaInicio: true, horaFim: true, duracaoMinutos: true,
            capacidade: true, valor: true, diaSemana: true,
            usuario: { select: { id: true, name: true } },
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

    const semVagoneteiro = instancias.filter((inst) => inst.atribuicoes.length === 0);
    const feed = await montarFeed(semVagoneteiro);

    res.json({
      total: feed.length,
      dias: Object.keys(agruparPorData(feed)).length,
      data: agruparPorData(feed),
      flat: feed,
    });
  } catch (error) {
    console.error('Erro ao carregar feed:', error);
    res.status(500).json({ message: 'Erro ao carregar feed de passeios' });
  }
}

// ─── helpers de feedDisponiveis ──────────────────────────────────

/** Último dia do mês corrente (para o feed sem filtro de data). */
function fimDoMesAtual(referencia: Date): Date {
  return new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
}

type InstanciaFeed = Prisma.SlotInstanciaGetPayload<{
  include: {
    slotPasseio: {
      select: {
        id: true; titulo: true; descricao: true; horaInicio: true; horaFim: true;
        duracaoMinutos: true; capacidade: true; valor: true; diaSemana: true;
        usuario: { select: { id: true; name: true } };
        _count: { select: { atribuicoes: true } };
      };
    };
    atribuicoes: { where: { status: 'ATRIBUIDO' }; select: { id: true; vagoneteiroId: true } };
  };
}>;

/** Monta cada item do feed com contagem de vagas carregada do passeio público. */
async function montarFeed(instancias: InstanciaFeed[]) {
  return Promise.all(
    instancias.map(async (inst) => {
      const vagasOcupadas = await atribuicaoService.contarVagasOcupadasDoPasseio(inst.id);
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
          disponiveis: Math.max(0, inst.slotPasseio.capacidade - vagasOcupadas),
        },
        jaPeguei: false,
        podePegar: true,
      };
    }),
  );
}
