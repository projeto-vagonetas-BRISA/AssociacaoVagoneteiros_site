import crypto from 'crypto';
import { TipoSlot, DiaSemana, SlotPasseio, SlotInstancia } from '@prisma/client';
import prisma from '../lib/prisma';

const DIAS_SEMANA_MAP: Record<number, DiaSemana> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
};

export type SlotComInstancias = SlotPasseio & { instancias: SlotInstancia[] };

export interface LoteConfig {
  titulo: string;
  descricao?: string;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
  capacidade: number;
  valor: number;
  usuarioId?: number;
  datas?: Date[];
  dataInicio?: Date;
  dataFim?: Date;
}

export interface ExpandirResultado {
  criadas: number;
  ignoradas: number;
  instancias: SlotInstancia[];
}

function getDiaSemana(date: Date): DiaSemana {
  return DIAS_SEMANA_MAP[date.getDay()];
}

function mesmaData(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function inicioDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function criarDataComHora(data: Date, hora: string): Date {
  const [hh, mm] = hora.split(':').map(Number);
  const d = new Date(data);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

function ajustarFimDeMes(data: Date, diaOriginal: number): Date {
  const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  if (diaOriginal > ultimoDia) {
    data.setDate(ultimoDia);
  }
  return data;
}

export class RecorrenciaService {
  
  async expandirSlot(
    slot: SlotComInstancias,
    periodo: { inicio: Date; fim: Date }
  ): Promise<ExpandirResultado> {
    if (slot.tipo !== TipoSlot.FIXO || slot.diaSemana === null) {
      return { criadas: 0, ignoradas: 0, instancias: [] };
    }

    const dataInicio = slot.dataInicio
      ? new Date(Math.max(slot.dataInicio.getTime(), periodo.inicio.getTime()))
      : periodo.inicio;
    const dataFim = slot.dataFim
      ? new Date(Math.min(slot.dataFim.getTime(), periodo.fim.getTime()))
      : periodo.fim;

    const instanciasExistentes = new Set(
      slot.instancias.map(i => `${i.data.toISOString().split('T')[0]}_${i.horaInicio}`)
    );

    const novasInstancias: SlotInstancia[] = [];
    let criadas = 0;
    let ignoradas = 0;

    const dataAtual = new Date(inicioDoDia(dataInicio));
    const diaOriginal = dataAtual.getDate();
    dataAtual.setDate(1);

    while (dataAtual <= dataFim) {
      ajustarFimDeMes(dataAtual, diaOriginal);

      if (dataAtual > dataFim) break;

      if (getDiaSemana(dataAtual) !== slot.diaSemana) {
        dataAtual.setDate(dataAtual.getDate() + 1);
        continue;
      }

      if (slot.intervaloDias && slot.intervaloDias > 1) {
        const diffDias = Math.floor(
          (dataAtual.getTime() - inicioDoDia(dataInicio).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDias % slot.intervaloDias !== 0) {
          dataAtual.setDate(dataAtual.getDate() + 1);
          continue;
        }
      }

      const chave = `${dataAtual.toISOString().split('T')[0]}_${slot.horaInicio}`;

      if (instanciasExistentes.has(chave)) {
        ignoradas++;
      } else {
        const instancia = await prisma.slotInstancia.create({
          data: {
            slotPasseioId: slot.id,
            data: new Date(dataAtual),
            horaInicio: slot.horaInicio,
            horaFim: slot.horaFim,
          },
        });
        novasInstancias.push(instancia);
        criadas++;
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return { criadas, ignoradas, instancias: novasInstancias };
  }

  async gerarLote(config: LoteConfig): Promise<SlotPasseio[]> {
    if (config.datas && config.datas.length > 0) {
      return this.gerarLotePorDatas(config);
    }

    if (config.dataInicio && config.dataFim) {
      return this.gerarLotePorIntervalo(config);
    }

    throw new Error('Informe datas ou dataInicio+dataFim para gerar o lote');
  }

  private async gerarLotePorDatas(config: LoteConfig): Promise<SlotPasseio[]> {
    const slotsCriados: SlotPasseio[] = [];

    for (const data of config.datas!) {
      const slot = await this.criarSlotIndividual(config, data);
      slotsCriados.push(slot);
    }

    return slotsCriados;
  }

  private async gerarLotePorIntervalo(config: LoteConfig): Promise<SlotPasseio[]> {
    const slotsCriados: SlotPasseio[] = [];
    // datainicio/fim já chegam normalizados como meia-noite local pelo chamador
    // (slotcontroller.gerarlote) — evita bug de fuso (slots em 00:00z utc ficavam
    // 3h defasados e não batiam com filtros que usam meia-noite local).
    const inicio = new Date(config.dataInicio!);
    const fim = new Date(config.dataFim!);
    const horaInicioMin = horaParaMinutos(config.horaInicio);
    const horaFimMin = horaParaMinutos(config.horaFim);
    const duracao = config.duracaoMinutos;
    const loteId = crypto.randomUUID();

    const dataAtual = new Date(inicio);
    while (dataAtual <= fim) {
      const dataStr = new Date(dataAtual);

      for (let min = horaInicioMin; min + duracao <= horaFimMin; min += duracao) {
        const hInicio = minutosParaHora(min);
        const hFim = minutosParaHora(min + duracao);

        const slot = await prisma.slotPasseio.create({
          data: {
            tipo: 'INDIVIDUAL',
            titulo: config.titulo,
            descricao: config.descricao,
            horaInicio: hInicio,
            horaFim: hFim,
            duracaoMinutos: duracao,
            capacidade: config.capacidade,
            valor: config.valor,
            usuarioId: config.usuarioId,
            loteId,
          },
        });

        await prisma.slotInstancia.create({
          data: {
            slotPasseioId: slot.id,
            data: dataStr,
            horaInicio: hInicio,
            horaFim: hFim,
          },
        });

        slotsCriados.push(slot);
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return slotsCriados;
  }

  private async criarSlotIndividual(
    config: LoteConfig,
    data: Date
  ): Promise<SlotPasseio> {
    const slot = await prisma.slotPasseio.create({
      data: {
        tipo: 'INDIVIDUAL',
        titulo: config.titulo,
        descricao: config.descricao,
        horaInicio: config.horaInicio,
        horaFim: config.horaFim,
        duracaoMinutos: config.duracaoMinutos,
        capacidade: config.capacidade,
        valor: config.valor,
        usuarioId: config.usuarioId,
        loteId: crypto.randomUUID(),
      },
    });

    await prisma.slotInstancia.create({
      data: {
        slotPasseioId: slot.id,
        data,
        horaInicio: config.horaInicio,
        horaFim: config.horaFim,
      },
    });

    return slot;
  }

  /**
   * expande todos os slots fixo ativos para um período
   */
  async expandirTodos(periodo: { inicio: Date; fim: Date }): Promise<{
    totalSlots: number;
    totalCriadas: number;
    totalIgnoradas: number;
  }> {
    const slots = await prisma.slotPasseio.findMany({
      where: {
        tipo: 'FIXO',
        status: { not: 'CANCELADO' },
        diaSemana: { not: null },
      },
      include: { instancias: true },
    });

    let totalCriadas = 0;
    let totalIgnoradas = 0;

    for (const slot of slots) {
      const resultado = await this.expandirSlot(slot as SlotComInstancias, periodo);
      totalCriadas += resultado.criadas;
      totalIgnoradas += resultado.ignoradas;
    }

    return {
      totalSlots: slots.length,
      totalCriadas,
      totalIgnoradas,
    };
  }

  /**
   * retorna as instâncias de um slot para um período
   * - para individual/lote: consulta instâncias existentes
   * - para fixo: primeiro expande (cria as que faltam), depois retorna todas do período
   */
  async obterInstancias(
    slotId: number,
    periodo: { inicio: Date; fim: Date }
  ): Promise<SlotInstancia[]> {
    const slot = await prisma.slotPasseio.findUnique({
      where: { id: slotId },
      include: { instancias: true },
    });

    if (!slot) return [];

    if (slot.tipo === 'FIXO') {
      await this.expandirSlot(slot as SlotComInstancias, periodo);
    }

    return prisma.slotInstancia.findMany({
      where: {
        slotPasseioId: slotId,
        data: { gte: periodo.inicio, lte: periodo.fim },
      },
      orderBy: { data: 'asc' },
    });
  }
}

export const recorrenciaService = new RecorrenciaService();
