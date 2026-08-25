import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

// Constrói a data como meia-noite LOCAL para casar com o armazenamento UTC
// dos Passeio/SlotInstancia (ex: 2026-08-09 local = 03:00:00Z no banco UTC).
function parseDataLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Cria um período de suspensão (ADMIN).
// Marca como SUSPENSO os slots e agendamentos do período, guardando o status
// anterior para permitir a restauração exata ao remover a suspensão.
export async function criarSuspensao(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { dataInicio, dataFim, motivo } = req.body;

    if (!dataInicio || !dataFim) {
      res.status(400).json({ message: 'Informe dataInicio e dataFim.' });
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      res.status(400).json({ message: 'Datas inválidas. Use o formato AAAA-MM-DD.' });
      return;
    }

    const inicio = parseDataLocal(dataInicio);
    const fim = parseDataLocal(dataFim);
    fim.setHours(23, 59, 59, 999);

    if (inicio > fim) {
      res.status(400).json({ message: 'dataInicio deve ser menor ou igual a dataFim.' });
      return;
    }

    // 1) Cria o registro do período
    const suspensao = await prisma.suspensao.create({
      data: {
        dataInicio: inicio,
        dataFim: fim,
        motivo: motivo || null,
        criadoPorId: (req as any).user?.id ?? null,
      },
    });

    // 2) Suspende SLOT INSTÂNCIAS do período (slots/vagas) — guarda status anterior
    const instancias = await prisma.slotInstancia.findMany({
      where: {
        data: { gte: inicio, lte: fim },
        status: { in: ['AGENDADO', 'EM_ANDAMENTO'] },
      },
      select: { id: true, status: true },
    });
    for (const inst of instancias) {
      await prisma.slotInstancia.update({
        where: { id: inst.id },
        data: {
          status: 'SUSPENSO',
          suspensaoId: suspensao.id,
          statusAnterior: inst.status,
        },
      });
    }

    // 3) Suspende AGENDAMENTOS do período (passeios já agendados) — guarda status anterior
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        passeio: { data: { gte: inicio, lte: fim } },
        status: { notIn: ['CANCELADO', 'REALIZADO'] },
      },
      select: { id: true, status: true },
    });
    for (const a of agendamentos) {
      await prisma.agendamento.update({
        where: { id: a.id },
        data: {
          status: 'SUSPENSO',
          suspensaoId: suspensao.id,
          statusAnterior: a.status,
        },
      });
    }

    res.status(201).json({
      message: `Suspensão criada: ${instancias.length} slot(s) e ${agendamentos.length} agendamento(s) suspenso(s).`,
      suspensao,
      slotsSuspensos: instancias.length,
      agendamentosSuspensos: agendamentos.length,
    });
  } catch (error) {
    console.error('Erro ao criar suspensão:', error);
    res.status(500).json({ message: 'Erro ao criar suspensão' });
  }
}

// Remove uma suspensão (ADMIN). Restaura slots e agendamentos ao status anterior.
export async function removerSuspensao(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const suspensao = await prisma.suspensao.findUnique({ where: { id } });
    if (!suspensao) {
      res.status(404).json({ message: 'Suspensão não encontrada' });
      return;
    }
    if (!suspensao.ativa) {
      res.status(400).json({ message: 'Esta suspensão já foi removida.' });
      return;
    }

    // Restaura slot instâncias vinculadas a esta suspensão
    const instanciasSuspensas = await prisma.slotInstancia.findMany({
      where: { suspensaoId: id },
      select: { id: true, statusAnterior: true },
    });
    for (const inst of instanciasSuspensas) {
      await prisma.slotInstancia.update({
        where: { id: inst.id },
        data: {
          status: inst.statusAnterior ?? 'AGENDADO',
          suspensaoId: null,
          statusAnterior: null,
        },
      });
    }

    // Restaura agendamentos vinculados a esta suspensão
    const agendamentosSuspensos = await prisma.agendamento.findMany({
      where: { suspensaoId: id },
      select: { id: true, statusAnterior: true },
    });
    for (const a of agendamentosSuspensos) {
      await prisma.agendamento.update({
        where: { id: a.id },
        data: {
          status: a.statusAnterior ?? 'PENDENTE',
          suspensaoId: null,
          statusAnterior: null,
        },
      });
    }

    // Marca suspensão como removida
    const atualizada = await prisma.suspensao.update({
      where: { id },
      data: {
        ativa: false,
        removidaEm: new Date(),
        removidaPorId: (req as any).user?.id ?? null,
      },
    });

    res.json({
      message: `Suspensão removida: ${instanciasSuspensas.length} slot(s) e ${agendamentosSuspensos.length} agendamento(s) restaurado(s).`,
      suspensao: atualizada,
      slotsRestaurados: instanciasSuspensas.length,
      agendamentosRestaurados: agendamentosSuspensos.length,
    });
  } catch (error) {
    console.error('Erro ao remover suspensão:', error);
    res.status(500).json({ message: 'Erro ao remover suspensão' });
  }
}

// Lista períodos de suspensão (ativos e removidos). ADMIN.
export async function listarSuspensoes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const suspensoes = await prisma.suspensao.findMany({
      orderBy: { criadoEm: 'desc' },
    });
    res.json({ suspensoes });
  } catch (error) {
    console.error('Erro ao listar suspensões:', error);
    res.status(500).json({ message: 'Erro ao listar suspensões' });
  }
}
