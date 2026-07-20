import { Request, Response } from 'express';
import prisma from '../lib/prisma';

interface FiltroPeriodo {
  inicio: Date;
  fim: Date;
}

function extrairPeriodo(req: Request): FiltroPeriodo {
  const { inicio, fim } = req.query;
  const agora = new Date();

  if (inicio && fim) {
    return {
      inicio: new Date(inicio as string),
      fim: new Date(fim as string),
    };
  }

  // Padrão: mês atual
  return {
    inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
    fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

// ─── Métricas Agregadas ─────────────────────────────────────────────

export async function metricas(req: Request, res: Response): Promise<void> {
  try {
    const { inicio, fim } = extrairPeriodo(req);

    // Total de passeios no período
    const totalPasseios = await prisma.passeio.count({
      where: { data: { gte: inicio, lte: fim }, ativo: true },
    });

    // Capacidade total disponibilizada no período
    const passeiosCapacidade = await prisma.passeio.findMany({
      where: { data: { gte: inicio, lte: fim }, ativo: true },
      select: { capacidade: true, id: true },
    });
    const vagasDisponibilizadas = passeiosCapacidade.reduce((s, p) => s + p.capacidade, 0);

    // Agendamentos no período (por passeio)
    const idsPasseios = passeiosCapacidade.map(p => p.id);
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        passeioId: { in: idsPasseios },
        status: { not: 'CANCELADO' },
      },
      select: { acompanhantes: true, status: true, passeioId: true, passeio: { select: { preco: true } } },
    });

    // Vagas preenchidas
    const vagasPreenchidas = agendamentos.reduce((s, a) => s + 1 + a.acompanhantes, 0);

    // Taxa de ocupação
    const taxaOcupacao = vagasDisponibilizadas > 0
      ? Math.round((vagasPreenchidas / vagasDisponibilizadas) * 100)
      : 0;

    // Cancelamentos
    const totalAgendamentos = await prisma.agendamento.count({
      where: { passeioId: { in: idsPasseios } },
    });
    const cancelados = await prisma.agendamento.count({
      where: { passeioId: { in: idsPasseios }, status: 'CANCELADO' },
    });
    const taxaCancelamento = totalAgendamentos > 0
      ? Math.round((cancelados / totalAgendamentos) * 100)
      : 0;

    // Realizados (atribuições realizadas no período)
    const realizados = await prisma.slotAtribuicao.count({
      where: {
        status: 'REALIZADO',
        slotPasseio: {
          instancias: {
            some: {
              data: { gte: inicio, lte: fim },
            },
          },
        },
      },
    });

    // Índice de conversão (realizados / (realizados + cancelados))
    const totalFinal = realizados + cancelados;
    const indiceConversao = totalFinal > 0
      ? Math.round((realizados / totalFinal) * 100)
      : 0;

    // Receita gerada (soma dos preços dos passeios com agendamentos não-cancelados)
    const receita = agendamentos
      .filter(a => a.status !== 'CANCELADO')
      .reduce((s, a) => s + Number(a.passeio.preco), 0);

    res.json({
      periodo: { inicio, fim },
      metricas: {
        taxaOcupacao,
        vagasDisponibilizadas,
        vagasPreenchidas,
        taxaCancelamento,
        totalAgendamentos,
        cancelados,
        realizados,
        indiceConversao,
        receita,
        totalPasseios,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ message: 'Erro ao buscar métricas' });
  }
}

// ─── Picos de Demanda ────────────────────────────────────────────────

export async function picosDemanda(req: Request, res: Response): Promise<void> {
  try {
    const { inicio, fim } = extrairPeriodo(req);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        status: { not: 'CANCELADO' },
        passeio: { data: { gte: inicio, lte: fim }, ativo: true },
      },
      select: {
        passeio: { select: { data: true, horario: true } },
        acompanhantes: true,
      },
    });

    // Agrupar por dia da semana
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const porDia: Record<string, number> = {};
    const porDiaSemana: Record<string, number> = {};
    const porHorario: Record<string, number> = {};

    for (const a of agendamentos) {
      const data = new Date(a.passeio.data);
      const diaStr = data.toISOString().slice(0, 10);
      const diaSemana = diasSemana[data.getDay()];
      const horario = a.passeio.horario.slice(0, 5);
      const qtd = 1 + a.acompanhantes;

      porDia[diaStr] = (porDia[diaStr] || 0) + qtd;
      porDiaSemana[diaSemana] = (porDiaSemana[diaSemana] || 0) + qtd;
      porHorario[horario] = (porHorario[horario] || 0) + qtd;
    }

    res.json({
      periodo: { inicio, fim },
      picos: {
        porDia: Object.entries(porDia).map(([dia, total]) => ({ dia, total })),
        porDiaSemana: Object.entries(porDiaSemana).map(([dia, total]) => ({ dia, total })),
        porHorario: Object.entries(porHorario).map(([horario, total]) => ({ horario, total })),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar picos de demanda:', error);
    res.status(500).json({ message: 'Erro ao buscar picos de demanda' });
  }
}

// ─── Relatório de Faturamento ────────────────────────────────────────

export async function faturamento(req: Request, res: Response): Promise<void> {
  try {
    const { inicio, fim } = extrairPeriodo(req);
    const { ordenar } = req.query;

    const atribuicoes = await prisma.slotAtribuicao.findMany({
      where: {
        status: 'REALIZADO',
        slotPasseio: {
          instancias: {
            some: {
              data: { gte: inicio, lte: fim },
            },
          },
        },
      },
      include: {
        vagoneteiro: { select: { id: true, name: true } },
        slotPasseio: { select: { titulo: true, valor: true } },
        instancia: { select: { data: true, horaInicio: true } },
      },
      orderBy: { atribuidoEm: 'desc' },
    });

    // Agrupar por vagoneteiro
    const porVagoneteiro: Record<number, {
      id: number;
      nome: string;
      passeios: { titulo: string; data: string; valor: number }[];
      total: number;
    }> = {};

    for (const attr of atribuicoes) {
      const vid = attr.vagoneteiro.id;
      if (!porVagoneteiro[vid]) {
        porVagoneteiro[vid] = {
          id: vid,
          nome: attr.vagoneteiro.name,
          passeios: [],
          total: 0,
        };
      }
      const valor = Number(attr.slotPasseio.valor);
      porVagoneteiro[vid].passeios.push({
        titulo: attr.slotPasseio.titulo,
        data: attr.instancia?.data?.toISOString().slice(0, 10) || '',
        valor,
      });
      porVagoneteiro[vid].total += valor;
    }

    let lista = Object.values(porVagoneteiro);

    // Ordenação
    if (ordenar === 'total') {
      lista.sort((a, b) => b.total - a.total);
    } else if (ordenar === 'nome') {
      lista.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    const totalGeral = lista.reduce((s, v) => s + v.total, 0);

    res.json({
      periodo: { inicio, fim },
      totalGeral,
      vagoneteiros: lista,
    });
  } catch (error) {
    console.error('Erro ao buscar faturamento:', error);
    res.status(500).json({ message: 'Erro ao buscar faturamento' });
  }
}
