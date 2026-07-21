import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { PrismaClient, TipoSlot, DiaSemana, StatusSlot } from '@prisma/client';
import { SlotFactory, SlotComponent } from '../services/agendamento.service';
import { recorrenciaService } from '../services/recorrencia.service';

const prisma = new PrismaClient();

// ─── HELPERS ────────────────────────────────────────────────────────

function parseEnum<T extends Record<string, string>>(enumObj: T, value: string): T[keyof T] | null {
  const vals = Object.values(enumObj);
  return vals.includes(value as any) ? (value as T[keyof T]) : null;
}

/** Converte "HH:MM" para total de minutos */
function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/** Converte total de minutos para "HH:MM" */
function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Calcula a duração em minutos entre duas strings "HH:MM" */
function calcularDuracao(horaInicio: string, horaFim: string): number {
  return horaParaMinutos(horaFim) - horaParaMinutos(horaInicio);
}

// ─── CRUD ───────────────────────────────────────────────────────────

export async function criar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const {
      tipo, titulo, descricao,
      horaInicio, horaFim, duracaoMinutos,
      diaSemana, dataInicio, dataFim, intervaloDias,
      capacidade, valor, usuarioId,
    } = req.body;

    // Validações básicas
    if (!tipo || !titulo || !horaInicio || !horaFim || capacidade === undefined || valor === undefined) {
      res.status(400).json({ message: 'tipo, titulo, horaInicio, horaFim, capacidade e valor são obrigatórios' });
      return;
    }

    const parsedTipo = parseEnum(TipoSlot, tipo);
    if (!parsedTipo) {
      res.status(400).json({ message: `tipo inválido. Valores: ${Object.values(TipoSlot).join(', ')}` });
      return;
    }

    // Validar diaSemana se for FIXO
    let parsedDiaSemana: DiaSemana | undefined;
    if (parsedTipo === 'FIXO') {
      if (!diaSemana) {
        res.status(400).json({ message: 'diaSemana é obrigatório para slots FIXO' });
        return;
      }
      parsedDiaSemana = parseEnum(DiaSemana, diaSemana) || undefined;
      if (!parsedDiaSemana) {
        res.status(400).json({ message: `diaSemana inválido. Valores: ${Object.values(DiaSemana).join(', ')}` });
        return;
      }
    }

    const parsedValor = parseFloat(valor);
    const parsedCapacidade = parseInt(capacidade, 10);
    const parsedDuracao = duracaoMinutos ? parseInt(duracaoMinutos, 10) : calcularDuracao(horaInicio, horaFim);

    const slot = await prisma.slotPasseio.create({
      data: {
        tipo: parsedTipo,
        titulo,
        descricao: descricao || null,
        horaInicio,
        horaFim,
        duracaoMinutos: parsedDuracao,
        diaSemana: parsedDiaSemana || null,
        dataInicio: dataInicio ? new Date(dataInicio) : (parsedTipo === 'FIXO' ? new Date() : null),
        dataFim: dataFim ? new Date(dataFim) : null,
        intervaloDias: intervaloDias ? parseInt(intervaloDias, 10) : null,
        capacidade: parsedCapacidade,
        valor: parsedValor,
        usuarioId: usuarioId ? parseInt(usuarioId, 10) : req.user?.id || null,
        loteId: parsedTipo === 'LOTE' ? crypto.randomUUID() : undefined,
      },
      include: { usuario: { select: { id: true, name: true } } },
    });

    // Se for FIXO, expandir automaticamente para as próximas semanas
    if (parsedTipo === 'FIXO') {
      const hoje = new Date();
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 3, 0);
      const slotComInstancias = await prisma.slotPasseio.findUnique({
        where: { id: slot.id },
        include: { instancias: true },
      });
      if (slotComInstancias) {
        await recorrenciaService.expandirSlot(slotComInstancias as any, { inicio: hoje, fim: fimMes });
      }
    }

    res.status(201).json(slot);
  } catch (error) {
    console.error('Erro ao criar slot:', error);
    res.status(500).json({ message: 'Erro ao criar slot' });
  }
}

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { tipo, status, usuarioId, page, limit } = req.query;
    const pagina = Math.max(1, parseInt(page as string) || 1);
    const limite = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pagina - 1) * limite;

    const where: any = {};

    if (tipo) {
      const parsedTipo = parseEnum(TipoSlot, tipo as string);
      if (parsedTipo) where.tipo = parsedTipo;
    }
    if (status) where.status = status as string;
    if (usuarioId) where.usuarioId = parseInt(usuarioId as string, 10);

    const [slots, total] = await Promise.all([
      prisma.slotPasseio.findMany({
        where,
        include: {
          usuario: { select: { id: true, name: true } },
          _count: { select: { instancias: true, atribuicoes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limite,
      }),
      prisma.slotPasseio.count({ where }),
    ]);

    res.json({
      data: slots,
      page: pagina,
      limit: limite,
      total,
      totalPages: Math.ceil(total / limite),
    });
  } catch (error) {
    console.error('Erro ao listar slots:', error);
    res.status(500).json({ message: 'Erro ao listar slots' });
  }
}

export async function buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido' }); return; }

    const slot = await prisma.slotPasseio.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, name: true } },
        instancias: { orderBy: { data: 'asc' }, take: 60 },
        atribuicoes: {
          include: { vagoneteiro: { select: { id: true, name: true } } },
        },
      },
    });

    if (!slot) { res.status(404).json({ message: 'Slot não encontrado' }); return; }

    res.json(slot);
  } catch (error) {
    console.error('Erro ao buscar slot:', error);
    res.status(500).json({ message: 'Erro ao buscar slot' });
  }
}

export async function atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido' }); return; }

    const existente = await prisma.slotPasseio.findUnique({ where: { id } });
    if (!existente) { res.status(404).json({ message: 'Slot não encontrado' }); return; }

    const {
      titulo, descricao, horaInicio, horaFim, duracaoMinutos,
      diaSemana, dataInicio, dataFim, intervaloDias,
      capacidade, valor, status,
    } = req.body;

    const data: any = {};
    if (titulo !== undefined) data.titulo = titulo;
    if (descricao !== undefined) data.descricao = descricao;
    if (horaInicio !== undefined) data.horaInicio = horaInicio;
    if (horaFim !== undefined) data.horaFim = horaFim;
    if (duracaoMinutos !== undefined) data.duracaoMinutos = parseInt(duracaoMinutos, 10);
    if (diaSemana !== undefined) data.diaSemana = parseEnum(DiaSemana, diaSemana);
    if (dataInicio !== undefined) data.dataInicio = new Date(dataInicio);
    if (dataFim !== undefined) data.dataFim = dataFim ? new Date(dataFim) : null;
    if (intervaloDias !== undefined) data.intervaloDias = parseInt(intervaloDias, 10);
    if (capacidade !== undefined) data.capacidade = parseInt(capacidade, 10);
    if (valor !== undefined) data.valor = parseFloat(valor);
    if (status !== undefined) data.status = parseEnum(StatusSlot, status) || undefined;

    const slot = await prisma.slotPasseio.update({
      where: { id },
      data,
      include: { usuario: { select: { id: true, name: true } } },
    });

    res.json(slot);
  } catch (error) {
    console.error('Erro ao atualizar slot:', error);
    res.status(500).json({ message: 'Erro ao atualizar slot' });
  }
}

export async function cancelar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido' }); return; }

    const existente = await prisma.slotPasseio.findUnique({ where: { id } });
    if (!existente) { res.status(404).json({ message: 'Slot não encontrado' }); return; }

    const slot = await prisma.slotPasseio.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });

    // Cancelar instâncias futuras também
    await prisma.slotInstancia.updateMany({
      where: { slotPasseioId: id, data: { gte: new Date() } },
      data: { status: 'CANCELADO' },
    });

    res.json({ message: 'Slot cancelado', slot });
  } catch (error) {
    console.error('Erro ao cancelar slot:', error);
    res.status(500).json({ message: 'Erro ao cancelar slot' });
  }
}

// ─── EXPANSÃO ───────────────────────────────────────────────────────

export async function expandir(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido' }); return; }

    const slot = await prisma.slotPasseio.findUnique({
      where: { id },
      include: { instancias: true },
    });
    if (!slot) { res.status(404).json({ message: 'Slot não encontrado' }); return; }

    if (slot.tipo !== 'FIXO') {
      res.status(400).json({ message: 'Apenas slots FIXO podem ser expandidos' });
      return;
    }

    const { inicio, fim } = req.body;
    const periodo = {
      inicio: inicio ? new Date(inicio) : new Date(),
      fim: fim ? new Date(fim) : new Date(new Date().getFullYear(), 11, 31),
    };

    const resultado = await recorrenciaService.expandirSlot(slot as any, periodo);

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao expandir slot:', error);
    res.status(500).json({ message: 'Erro ao expandir slot' });
  }
}

export async function listarInstancias(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ message: 'ID inválido' }); return; }

    const { inicio, fim } = req.query;
    const periodo = {
      inicio: inicio ? new Date(inicio as string) : new Date(),
      fim: fim ? new Date(fim as string) : new Date(new Date().getFullYear(), 11, 31),
    };

    const slot = await prisma.slotPasseio.findUnique({
      where: { id },
      include: { instancias: true },
    });
    if (!slot) {
      res.status(404).json({ message: 'Slot não encontrado' });
      return;
    }

    // Usar Composite Pattern
    const component = SlotFactory.criar(slot);
    const instancias = await component.getInstancias(periodo);

    res.json({ data: instancias, total: instancias.length });
  } catch (error) {
    console.error('Erro ao listar instâncias:', error);
    res.status(500).json({ message: 'Erro ao listar instâncias' });
  }
}

// ─── LOTE ───────────────────────────────────────────────────────────

export async function gerarLote(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { titulo, descricao, horaInicio, horaFim, duracaoMinutos, capacidade, valor, usuarioId, dataInicio, dataFim } = req.body;

    if (!titulo || !horaInicio || !capacidade || !valor) {
      res.status(400).json({ message: 'titulo, horaInicio, capacidade e valor são obrigatórios' });
      return;
    }

    // Calcula duracao se não veio
    const duracao = duracaoMinutos ? parseInt(duracaoMinutos, 10) : (horaFim ? calcularDuracao(horaInicio, horaFim) : 60);

    const slots = await recorrenciaService.gerarLote({
      titulo,
      descricao: descricao || undefined,
      horaInicio,
      horaFim: horaFim || minutosParaHora(horaParaMinutos(horaInicio) + duracao),
      duracaoMinutos: duracao,
      capacidade: parseInt(capacidade, 10),
      valor: parseFloat(valor),
      usuarioId: usuarioId ? parseInt(usuarioId, 10) : req.user?.id,
      dataInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataFim: dataFim ? new Date(dataFim) : undefined,
    });

    res.status(201).json({ data: slots, total: slots.length });
  } catch (error) {
    console.error('Erro ao gerar lote:', error);
    res.status(500).json({ message: 'Erro ao gerar lote' });
  }
}

// ─── ATRIBUIÇÃO ─────────────────────────────────────────────────────

export async function listarDisponiveis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { data } = req.query;
    const hoje = new Date();
    const fimMes = data
      ? new Date(data as string)
      : new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);

    const slots = await prisma.slotPasseio.findMany({
      where: {
        status: 'DISPONIVEL',
        instancias: {
          some: {
            data: { gte: hoje, lte: fimMes },
            status: 'AGENDADO',
          },
        },
      },
      include: {
        usuario: { select: { id: true, name: true } },
        instancias: {
          where: { data: { gte: hoje, lte: fimMes }, status: 'AGENDADO' },
          orderBy: { data: 'asc' },
        },
        _count: { select: { atribuicoes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: slots, total: slots.length });
  } catch (error) {
    console.error('Erro ao listar disponíveis:', error);
    res.status(500).json({ message: 'Erro ao listar slots disponíveis' });
  }
}
