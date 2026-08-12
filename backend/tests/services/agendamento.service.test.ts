import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockObterInstancias = vi.fn();
const mockInstanciaFindMany = vi.fn();
const mockAtribuicaoFindMany = vi.fn();
const mockSlotPasseioFindUnique = vi.fn();

// recorrenciaService é importado estaticamente pelo SlotFixo
vi.mock('../../src/services/recorrencia.service', () => ({
  recorrenciaService: {
    obterInstancias: (...args: any[]) => mockObterInstancias(...args),
  },
}));

// SlotLote/SlotIndividual/ConflitoService usam `await import('../../src/lib/prisma')`
vi.mock('../../src/lib/prisma', () => ({
  default: {
    slotInstancia: {
      findMany: mockInstanciaFindMany,
    },
    slotAtribuicao: {
      findMany: mockAtribuicaoFindMany,
    },
    slotPasseio: {
      findUnique: mockSlotPasseioFindUnique,
    },
  },
  prisma: {
    slotInstancia: {
      findMany: mockInstanciaFindMany,
    },
    slotAtribuicao: {
      findMany: mockAtribuicaoFindMany,
    },
    slotPasseio: {
      findUnique: mockSlotPasseioFindUnique,
    },
  },
}));

const { SlotFactory, ConflitoService } = await import('../../src/services/agendamento.service');

const slotBase: any = {
  id: 1,
  tipo: 'FIXO',
  titulo: 'Passeio',
  horaInicio: '08:00',
  horaFim: '09:00',
  capacidade: 4,
  instancias: [{ id: 9, data: new Date(2026, 0, 5), horaInicio: '08:00' }],
};

beforeEach(() => vi.clearAllMocks());

describe('SlotFactory.criar', () => {
  it('cria componente para FIXO', () => {
    const comp = SlotFactory.criar(slotBase);
    expect(comp.getTipo()).toBe('FIXO');
    expect(comp.getTitulo()).toBe('Passeio');
    expect(comp.getHorario()).toEqual({ inicio: '08:00', fim: '09:00' });
  });

  it('cria componente para LOTE', () => {
    const comp = SlotFactory.criar({ ...slotBase, tipo: 'LOTE' });
    expect(comp.getTipo()).toBe('LOTE');
  });

  it('cria componente para INDIVIDUAL', () => {
    const comp = SlotFactory.criar({ ...slotBase, tipo: 'INDIVIDUAL' });
    expect(comp.getTipo()).toBe('INDIVIDUAL');
  });

  it('lança erro para tipo desconhecido', () => {
    expect(() => SlotFactory.criar({ ...slotBase, tipo: 'DESCONHECIDO' })).toThrow(
      'Tipo de slot desconhecido',
    );
  });
});

describe('SlotFixo (via SlotFactory)', () => {
  it('getInstancias delega para recorrenciaService.obterInstancias', async () => {
    mockObterInstancias.mockResolvedValue([{ id: 1 }]);
    const comp = SlotFactory.criar(slotBase);
    const res = await comp.getInstancias({ inicio: new Date(2026, 0, 1), fim: new Date(2026, 0, 31) });
    expect(mockObterInstancias).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ inicio: expect.any(Date) }),
    );
    expect(res).toEqual([{ id: 1 }]);
  });

  it('getDetalhes retorna slot, instâncias e vagas', async () => {
    mockObterInstancias.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const comp = SlotFactory.criar({ ...slotBase, capacidade: 4 });
    const detalhes = await comp.getDetalhes();
    expect(detalhes.slot).toBeDefined();
    expect(detalhes.instancias).toHaveLength(2);
    expect(detalhes.vagasOcupadas).toBe(0);
    expect(detalhes.vagasDisponiveis).toBe(4);
  });
});

describe('SlotLote / SlotIndividual (via SlotFactory)', () => {
  it('SlotLote.getInstancias consulta prisma.slotInstancia', async () => {
    mockInstanciaFindMany.mockResolvedValue([{ id: 1 }]);
    const comp = SlotFactory.criar({ ...slotBase, tipo: 'LOTE' });
    const periodo = { inicio: new Date(2026, 0, 1), fim: new Date(2026, 0, 31) };
    const res = await comp.getInstancias(periodo);
    expect(mockInstanciaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ slotPasseioId: 1 }) }),
    );
    expect(res).toEqual([{ id: 1 }]);
  });

  it('SlotIndividual.getInstancias consulta prisma.slotInstancia', async () => {
    mockInstanciaFindMany.mockResolvedValue([{ id: 3 }]);
    const comp = SlotFactory.criar({ ...slotBase, tipo: 'INDIVIDUAL' });
    const res = await comp.getInstancias({ inicio: new Date(2026, 0, 1), fim: new Date(2026, 0, 31) });
    expect(res).toEqual([{ id: 3 }]);
  });

  it('SlotLote.getDetalhes retorna instâncias', async () => {
    mockInstanciaFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const comp = SlotFactory.criar({ ...slotBase, tipo: 'LOTE', capacidade: 5 });
    const detalhes = await comp.getDetalhes();
    expect(detalhes.instancias).toHaveLength(3);
    expect(detalhes.vagasDisponiveis).toBe(5);
  });
});

describe('ConflitoService.verificarConflitoVagoneteiro', () => {
  it('retorna conflito HORARIO quando há sobreposição', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([
      {
        id: 10,
        vagoneteiroId: 2,
        status: 'ATRIBUIDO',
        instancia: { id: 5, horaInicio: '08:00', horaFim: '09:30' },
        slotPasseio: { id: 1 },
      },
    ]);

    const service = new ConflitoService();
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 5), '09:00', '10:00');

    expect(conflitos).toHaveLength(1);
    expect(conflitos[0].tipo).toBe('HORARIO');
    expect(conflitos[0].instanciaId).toBe(5);
    expect(mockAtribuicaoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ vagoneteiroId: 2, status: 'ATRIBUIDO' }),
      }),
    );
  });

  it('não retorna conflito quando horários não se sobrepõem', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([
      {
        id: 10,
        status: 'ATRIBUIDO',
        instancia: { id: 5, horaInicio: '08:00', horaFim: '09:00' },
        slotPasseio: { id: 1 },
      },
    ]);
    const service = new ConflitoService();
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 5), '09:30', '10:00');
    expect(conflitos).toHaveLength(0);
  });

  it('ignora atribuições sem instância', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([{ id: 10, status: 'ATRIBUIDO', instancia: null }]);
    const service = new ConflitoService();
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 5), '09:00', '10:00');
    expect(conflitos).toHaveLength(0);
  });

  it('não retorna conflito quando não há atribuições na data', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([]);
    const service = new ConflitoService();
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 5), '09:00', '10:00');
    expect(conflitos).toHaveLength(0);
  });

  it('não retorna conflito quando horários são contíguos (um termina quando outro começa)', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([
      {
        id: 10,
        status: 'ATRIBUIDO',
        instancia: { id: 5, horaInicio: '10:00', horaFim: '11:00' },
        slotPasseio: { id: 1 },
      },
    ]);
    const service = new ConflitoService();
    // 09:00–10:00 não sobrepõe 10:00–11:00 (fim == inicio)
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 5), '09:00', '10:00');
    expect(conflitos).toHaveLength(0);
  });

  it('não retorna conflito quando fuso/data não batem (mesmo horário em outra data)', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([]);
    const service = new ConflitoService();
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 6), '09:00', '10:00');
    // sem atribuições retornadas → 0 conflito
    expect(conflitos).toHaveLength(0);
  });

  it('retorna conflito quando sobreposição é exata (mesmo horário)', async () => {
    mockAtribuicaoFindMany.mockResolvedValue([
      {
        id: 10,
        status: 'ATRIBUIDO',
        instancia: { id: 5, horaInicio: '08:00', horaFim: '09:00' },
        slotPasseio: { id: 1 },
      },
    ]);
    const service = new ConflitoService();
    const conflitos = await service.verificarConflitoVagoneteiro(2, new Date(2026, 0, 5), '08:00', '09:00');
    expect(conflitos).toHaveLength(1);
  });
});

describe('ConflitoService.verificarCapacidade', () => {
  it('retorna conflito CAPACIDADE quando slot está lotado', async () => {
    mockSlotPasseioFindUnique.mockResolvedValue({
      id: 1,
      capacidade: 2,
      atribuicoes: [{ id: 1, status: 'ATRIBUIDO' }, { id: 2, status: 'ATRIBUIDO' }],
    });
    const service = new ConflitoService();
    const conflitos = await service.verificarCapacidade(1);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0].tipo).toBe('CAPACIDADE');
    expect(conflitos[0].mensagem).toBe('Slot está lotado');
  });

  it('não retorna conflito quando há vagas', async () => {
    mockSlotPasseioFindUnique.mockResolvedValue({
      id: 1,
      capacidade: 4,
      atribuicoes: [{ id: 1, status: 'ATRIBUIDO' }],
    });
    const service = new ConflitoService();
    const conflitos = await service.verificarCapacidade(1);
    expect(conflitos).toHaveLength(0);
  });

  it('retorna vazio quando slot não existe', async () => {
    mockSlotPasseioFindUnique.mockResolvedValue(null);
    const service = new ConflitoService();
    const conflitos = await service.verificarCapacidade(999);
    expect(conflitos).toEqual([]);
  });
});
