import { PrismaClient, TipoSlot, DiaSemana, SlotPasseio, SlotInstancia } from '@prisma/client';

const prisma = new PrismaClient();

const DIAS_SEMANA_MAP: Record<number, DiaSemana> = {
  0: 'DOMINGO',
  1: 'SEGUNDA',
  2: 'TERCA',
  3: 'QUARTA',
  4: 'QUINTA',
  5: 'SEXTA',
  6: 'SABADO',
};

// ─── TIPOS ─────────────────────────────────────────────────────────

export interface LoteConfig {
  titulo: string;
  descricao?: string;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
  capacidade: number;
  valor: number;
  usuarioId?: number;
  /** Lista de datas específicas para o lote */
  datas: Date[];
}

export interface ExpandirResultado {
  criadas: number;
  ignoradas: number;
  instancias: SlotInstancia[];
}

// ─── HELPER ─────────────────────────────────────────────────────────

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

function criarDataComHora(data: Date, hora: string): Date {
  const [hh, mm] = hora.split(':').map(Number);
  const d = new Date(data);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

/**
 * Ajusta dia para o último dia do mês se o dia original ultrapassar
 * Ex: 31 de janeiro → 28/29 de fevereiro
 */
function ajustarFimDeMes(data: Date, diaOriginal: number): Date {
  const ultimoDia = new Date(data.getFullYear(), data.getMonth() + 1, 0).getDate();
  if (diaOriginal > ultimoDia) {
    data.setDate(ultimoDia);
  }
  return data;
}

// ─── SERVIÇO ────────────────────────────────────────────────────────

export class RecorrenciaService {
  
  /**
   * Expande um SlotPasseio FIXO em instâncias para um período
   */
  async expandirSlot(
    slot: SlotPasseio & { instancias: SlotInstancia[] },
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
    dataAtual.setDate(1); // começa do dia 1 para iterar corretamente

    while (dataAtual <= dataFim) {
      // Ajustar dia do mês
      ajustarFimDeMes(dataAtual, diaOriginal);

      // Pular se passou do fim
      if (dataAtual > dataFim) break;

      // Verificar dia da semana
      if (getDiaSemana(dataAtual) !== slot.diaSemana) {
        dataAtual.setDate(dataAtual.getDate() + 1);
        continue;
      }

      // Verificar intervalo de dias
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

  /**
   * Gera um lote de slots INDIVIDUAL a partir de uma configuração
   */
  async gerarLote(config: LoteConfig): Promise<SlotPasseio[]> {
    const slotsCriados: SlotPasseio[] = [];

    for (const data of config.datas) {
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

      // Criar instância única para este slot avulso
      await prisma.slotInstancia.create({
        data: {
          slotPasseioId: slot.id,
          data,
          horaInicio: config.horaInicio,
          horaFim: config.horaFim,
        },
      });

      slotsCriados.push(slot);
    }

    return slotsCriados;
  }

  /**
   * Expande todos os slots FIXO ativos para um período
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
      const resultado = await this.expandirSlot(slot as any, periodo);
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
   * Retorna as instâncias de um slot para um período (já existentes ou calculadas)
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

    // Se for INDIVIDUAL ou LOTE, retorna instâncias existentes
    if (slot.tipo !== 'FIXO') {
      return slot.instancias.filter(i => {
        const d = new Date(i.data);
        return d >= periodo.inicio && d <= periodo.fim;
      });
    }

    // Se for FIXO, expande e retorna
    const resultado = await this.expandirSlot(slot as any, periodo);
    return resultado.instancias;
  }
}

export const recorrenciaService = new RecorrenciaService();
