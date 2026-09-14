import { SlotPasseio, SlotInstancia, TipoSlot } from '@prisma/client';
import { recorrenciaService } from './recorrencia.service';

// ─── interface base (component) ────────────────────────────────────

export interface SlotComponent {
  getTipo(): TipoSlot;
  getTitulo(): string;
  getHorario(): { inicio: string; fim: string };
  getInstancias(periodo: { inicio: Date; fim: Date }): Promise<SlotInstancia[]>;
  getDetalhes(): Promise<SlotDetalhes>;
}

export interface SlotDetalhes {
  slot: SlotPasseio;
  instancias: SlotInstancia[];
  vagasOcupadas: number;
  vagasDisponiveis: number;
}

// ─── factory ────────────────────────────────────────────────────────

export class SlotFactory {
  static criar(slot: SlotPasseio): SlotComponent {
    switch (slot.tipo) {
      case 'FIXO':
        return new SlotFixo(slot);
      case 'LOTE':
        return new SlotLote(slot);
      case 'INDIVIDUAL':
        return new SlotIndividual(slot);
      default:
        throw new Error(`Tipo de slot desconhecido: ${slot.tipo}`);
    }
  }
}

// ─── implementações ─────────────────────────────────────────────────

class SlotBase implements SlotComponent {
  protected slot: SlotPasseio;

  constructor(slot: SlotPasseio) {
    this.slot = slot;
  }

  getTipo(): TipoSlot {
    return this.slot.tipo;
  }

  getTitulo(): string {
    return this.slot.titulo;
  }

  getHorario(): { inicio: string; fim: string } {
    return {
      inicio: this.slot.horaInicio,
      fim: this.slot.horaFim,
    };
  }

  async getInstancias(periodo: { inicio: Date; fim: Date }): Promise<SlotInstancia[]> {
    throw new Error('Método deve ser implementado pela subclasse');
  }

  async getDetalhes(): Promise<SlotDetalhes> {
    throw new Error('Método deve ser implementado pela subclasse');
  }
}

/**
 * slotfixo — recorrência semanal/mensal
 * expande datas recorrentes em instâncias via engine de recorrência
 */
class SlotFixo extends SlotBase {
  async getInstancias(periodo: { inicio: Date; fim: Date }): Promise<SlotInstancia[]> {
    return recorrenciaService.obterInstancias(this.slot.id, periodo);
  }

  async getDetalhes(): Promise<SlotDetalhes> {
    const hoje = new Date();
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);

    const instancias = await this.getInstancias({ inicio: hoje, fim: fimMes });

    return {
      slot: this.slot,
      instancias,
      vagasOcupadas: 0,  // será calculado com atribuições
      vagasDisponiveis: this.slot.capacidade,
    };
  }
}

/**
 * slotlote — grupo de slots gerados em lote
 * retorna as instâncias existentes, sem expandir
 */
class SlotLote extends SlotBase {
  async getInstancias(periodo: { inicio: Date; fim: Date }): Promise<SlotInstancia[]> {
    const { prisma } = await import('../lib/prisma');
    const instancias = await prisma.slotInstancia.findMany({
      where: {
        slotPasseioId: this.slot.id,
        data: { gte: periodo.inicio, lte: periodo.fim },
      },
      orderBy: { data: 'asc' },
    });
    return instancias;
  }

  async getDetalhes(): Promise<SlotDetalhes> {
    const hoje = new Date();
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);

    const instancias = await this.getInstancias({ inicio: hoje, fim: fimMes });

    return {
      slot: this.slot,
      instancias,
      vagasOcupadas: 0,
      vagasDisponiveis: this.slot.capacidade,
    };
  }
}

/**
 * slotindividual — slot avulso (manual)
 * retorna sua única instância
 */
class SlotIndividual extends SlotBase {
  async getInstancias(periodo: { inicio: Date; fim: Date }): Promise<SlotInstancia[]> {
    const { prisma } = await import('../lib/prisma');
    const instancias = await prisma.slotInstancia.findMany({
      where: {
        slotPasseioId: this.slot.id,
        data: { gte: periodo.inicio, lte: periodo.fim },
      },
      orderBy: { data: 'asc' },
    });
    return instancias;
  }

  async getDetalhes(): Promise<SlotDetalhes> {
    const hoje = new Date();
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 2, 0);

    const instancias = await this.getInstancias({ inicio: hoje, fim: fimMes });

    return {
      slot: this.slot,
      instancias,
      vagasOcupadas: 0,
      vagasDisponiveis: this.slot.capacidade,
    };
  }
}

// ─── validação de conflitos ────────────────────────────────────────

export interface Conflito {
  tipo: 'HORARIO' | 'CAPACIDADE' | 'VAGONETEIRO';
  mensagem: string;
  instanciaId?: number;
}

export class ConflitoService {
  /**
   * verifica se um vagoneteiro tem conflito de horário
   */
  async verificarConflitoVagoneteiro(
    vagoneteiroId: number,
    data: Date,
    horaInicio: string,
    horaFim: string
  ): Promise<Conflito[]> {
    const { prisma } = await import('../lib/prisma');
    const conflitos: Conflito[] = [];

    // buscar atribuições do vagoneteiro na mesma data
    const atribuicoes = await prisma.slotAtribuicao.findMany({
      where: {
        vagoneteiroId,
        status: 'ATRIBUIDO',
        instancia: {
          data,
          status: { not: 'CANCELADO' },
        },
      },
      include: {
        instancia: true,
        slotPasseio: true,
      },
    });

    for (const attr of atribuicoes) {
      if (!attr.instancia) continue;

      // verificar sobreposição de horário
      if (
        horaInicio < attr.instancia.horaFim &&
        horaFim > attr.instancia.horaInicio
      ) {
        conflitos.push({
          tipo: 'HORARIO',
          mensagem: `Vagoneteiro já tem compromisso das ${attr.instancia.horaInicio} às ${attr.instancia.horaFim}`,
          instanciaId: attr.instancia.id,
        });
      }
    }

    return conflitos;
  }

  /**
   * verifica se um slot tem capacidade disponível
   */
  async verificarCapacidade(slotPasseioId: number): Promise<Conflito[]> {
    const { prisma } = await import('../lib/prisma');
    const conflitos: Conflito[] = [];

    const slot = await prisma.slotPasseio.findUnique({
      where: { id: slotPasseioId },
      include: {
        atribuicoes: {
          where: { status: 'ATRIBUIDO' },
        },
      },
    });

    if (!slot) return conflitos;

    const vagasOcupadas = slot.atribuicoes.length;
    if (vagasOcupadas >= slot.capacidade) {
      conflitos.push({
        tipo: 'CAPACIDADE',
        mensagem: 'Slot está lotado',
      });
    }

    return conflitos;
  }
}

export const conflitoService = new ConflitoService();
