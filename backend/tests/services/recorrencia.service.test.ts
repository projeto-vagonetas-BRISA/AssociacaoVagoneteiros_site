import { describe, it, expect, vi, beforeEach } from 'vitest';

const TipoSlot = { FIXO: 'FIXO', LOTE: 'LOTE', INDIVIDUAL: 'INDIVIDUAL' } as const;

const mockSlotFindMany = vi.fn();
const mockSlotFindUnique = vi.fn();
const mockSlotCreate = vi.fn();
const mockInstanciaCreate = vi.fn();
const mockInstanciaFindMany = vi.fn();

vi.mock('@prisma/client', () => ({
  TipoSlot,
  DiaSemana: {
    SEGUNDA: 'SEGUNDA',
    TERCA: 'TERCA',
    QUARTA: 'QUARTA',
    QUINTA: 'QUINTA',
    SEXTA: 'SEXTA',
    SABADO: 'SABADO',
    DOMINGO: 'DOMINGO',
  },
  SlotPasseio: class {},
  SlotInstancia: class {},
}));

vi.mock('../../src/lib/prisma', () => ({
  default: {
    slotPasseio: {
      findMany: mockSlotFindMany,
      findUnique: mockSlotFindUnique,
      create: mockSlotCreate,
    },
    slotInstancia: {
      create: mockInstanciaCreate,
      findMany: mockInstanciaFindMany,
    },
  },
}));

const {
  recorrenciaService,
  horaParaMinutos,
  minutosParaHora,
} = await import('../../src/services/recorrencia.service');

beforeEach(() => {
  vi.clearAllMocks();
});

// helper: cria um slot FIXO base
function slotFixo(overrides: any = {}) {
  return {
    id: 1,
    tipo: 'FIXO',
    titulo: 'Passeio fixo',
    descricao: null,
    horaInicio: '08:00',
    horaFim: '09:00',
    duracaoMinutos: 60,
    diaSemana: 'SEGUNDA',
    dataInicio: null,
    dataFim: null,
    intervaloDias: null,
    loteId: null,
    capacidade: 4,
    valor: 25,
    usuarioId: null,
    status: 'DISPONIVEL',
    instancias: [],
    ...overrides,
  };
}

// helper de data local (evita fuso UTC do parse de string ISO)
function data(y: number, m: number, d: number): Date {
  return new Date(y, m, d);
}

describe('recorrencia.service — helpers puros', () => {
  it('horaParaMinutos converte corretamente', () => {
    expect(horaParaMinutos('08:30')).toBe(510);
    expect(horaParaMinutos('00:00')).toBe(0);
    expect(horaParaMinutos('23:59')).toBe(1439);
  });

  it('minutosParaHora converte corretamente', () => {
    expect(minutosParaHora(510)).toBe('08:30');
    expect(minutosParaHora(0)).toBe('00:00');
    expect(minutosParaHora(1439)).toBe('23:59');
  });

  it('round-trip horaParaMinutos/minutosParaHora é consistente', () => {
    // varre todos os minutos do dia (a cada 7) e confere round-trip
    for (let m = 0; m < 24 * 60; m += 7) {
      expect(horaParaMinutos(minutosParaHora(m))).toBe(m);
    }
  });
});

describe('recorrencia.service — expandirSlot', () => {
  it('retorna vazio para slot não-FIXO', async () => {
    const res = await recorrenciaService.expandirSlot(
      slotFixo({ tipo: 'INDIVIDUAL' }) as any,
      { inicio: data(2026,0,1), fim: data(2026,0,31) },
    );
    expect(res).toEqual({ criadas: 0, ignoradas: 0, instancias: [] });
    expect(mockInstanciaCreate).not.toHaveBeenCalled();
  });

  it('retorna vazio para FIXO sem diaSemana', async () => {
    const res = await recorrenciaService.expandirSlot(
      slotFixo({ diaSemana: null }) as any,
      { inicio: data(2026,0,1), fim: data(2026,0,31) },
    );
    expect(res).toEqual({ criadas: 0, ignoradas: 0, instancias: [] });
  });

  it('cria instâncias para todas as segundas do período', async () => {
    // Janeiro/2026: segundas = 05, 12, 19, 26
    mockInstanciaCreate
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 4 });

    const res = await recorrenciaService.expandirSlot(
      slotFixo({ diaSemana: 'SEGUNDA' }),
      { inicio: data(2026, 0, 1), fim: data(2026, 0, 31) },
    );

    expect(res.criadas).toBe(4);
    expect(res.ignoradas).toBe(0);
    expect(res.instancias).toHaveLength(4);
    expect(mockInstanciaCreate).toHaveBeenCalledTimes(4);
    // primeira instância deve ser 05/01
    expect(mockInstanciaCreate.mock.calls[0][0].data.slotPasseioId).toBe(1);
    expect(mockInstanciaCreate.mock.calls[0][0].data.data).toEqual(data(2026, 0, 5));
  });

  it('marca como ignoradas as instâncias já existentes', async () => {
    const existente = {
      id: 99,
      data: data(2026, 0, 5),
      horaInicio: '08:00',
    };
    const slot = slotFixo({ instancias: [existente as any] });

    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.expandirSlot(slot, {
      inicio: data(2026, 0, 1),
      fim: data(2026, 0, 31),
    });

    // 4 segundas, 1 já existente → 3 criadas, 1 ignorada
    expect(res.criadas).toBe(3);
    expect(res.ignoradas).toBe(1);
    expect(mockInstanciaCreate).toHaveBeenCalledTimes(3);
  });

  it('respeita dataFim do próprio slot (limitação por dataFim)', async () => {
    const slot = slotFixo({
      diaSemana: 'SEGUNDA',
      dataInicio: data(2026, 0, 10), // ponto de partida do loop (logo resetado p/ dia 1)
      dataFim: data(2026, 0, 22), // segundas até 22/01: 05, 12, 19
    });
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.expandirSlot(slot, {
      inicio: data(2026, 0, 1),
      fim: data(2026, 0, 31),
    });

    // dataFim 22/01 corta em 22: segundas 05, 12, 19 → 3
    // (dataInicio não limita por dia: o loop recomeça no dia 1 do mês)
    expect(res.criadas).toBe(3);
  });

  it('aplica intervalo de dias (a cada 14 dias a partir da dataInicio)', async () => {
    // dataInicio do slot = segunda 05/01 → datas válidas: 05 e 19/01
    const slot2 = slotFixo({ diaSemana: 'SEGUNDA', intervaloDias: 14, dataInicio: data(2026, 0, 5) });
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.expandirSlot(slot2, {
      inicio: data(2026, 0, 1),
      fim: data(2026, 0, 31),
    });

    // a partir de 05/01 (diff 0), valem 05 e 19/01 → 2
    expect(res.criadas).toBe(2);
  });

  it('ajusta fim de mês para dia 31 em mês mais curto', async () => {
    // Fevereiro tem 28 dias em 2026 (não bissexto? 2026 não é bissexto)
    const slot = slotFixo({ diaSemana: 'SEGUNDA' });
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.expandirSlot(slot, {
      inicio: data(2026, 1, 1),
      fim: data(2026, 1, 28),
    });

    // fev/2026 segundas: 02, 09, 16, 23 → 4
    expect(res.criadas).toBe(4);
  });
});

describe('recorrencia.service — gerarLote', () => {
  it('lança erro sem datas nem intervalo', async () => {
    await expect(
      recorrenciaService.gerarLote({
        titulo: 'x',
        horaInicio: '08:00',
        horaFim: '09:00',
        duracaoMinutos: 60,
        capacidade: 4,
        valor: 25,
      }),
    ).rejects.toThrow('Informe datas ou dataInicio+dataFim');
  });

  it('gera 1 slot por data no modo datas', async () => {
    mockSlotCreate
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.gerarLote({
      titulo: 'Lote',
      horaInicio: '08:00',
      horaFim: '09:00',
      duracaoMinutos: 60,
      capacidade: 4,
      valor: 25,
      datas: [data(2026,0,10), data(2026,0,11)],
    });

    expect(res).toHaveLength(2);
    expect(mockSlotCreate).toHaveBeenCalledTimes(2);
    expect(mockInstanciaCreate).toHaveBeenCalledTimes(2);
    expect(mockSlotCreate.mock.calls[0][0].data.tipo).toBe('INDIVIDUAL');
    expect(mockSlotCreate.mock.calls[0][0].data.loteId).toBeDefined();
  });

  it('gera grid de slots no modo intervalo (cada duracao dentro do horário)', async () => {
    // 08:00–09:00, duração 30 → 2 slots: 08:00-08:30, 08:30-09:00
    mockSlotCreate
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.gerarLote({
      titulo: 'Grid',
      horaInicio: '08:00',
      horaFim: '09:00',
      duracaoMinutos: 30,
      capacidade: 4,
      valor: 25,
      dataInicio: data(2026,0,10),
      dataFim: data(2026,0,10),
    });

    expect(res).toHaveLength(2);
    const t1 = mockSlotCreate.mock.calls[0][0].data;
    const t2 = mockSlotCreate.mock.calls[1][0].data;
    expect(t1.horaInicio).toBe('08:00');
    expect(t1.horaFim).toBe('08:30');
    expect(t2.horaInicio).toBe('08:30');
    expect(t2.horaFim).toBe('09:00');
    expect(t1.loteId).toBe(t2.loteId);
  });
});

describe('recorrencia.service — expandirTodos', () => {
  it('retorna zeros quando não há slots fixos', async () => {
    mockSlotFindMany.mockResolvedValue([]);
    const res = await recorrenciaService.expandirTodos({
      inicio: data(2026,0,1),
      fim: data(2026,0,31),
    });
    expect(res).toEqual({ totalSlots: 0, totalCriadas: 0, totalIgnoradas: 0 });
    expect(mockSlotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tipo: 'FIXO', status: { not: 'CANCELADO' } }),
      }),
    );
  });

  it('soma resultados de vários slots', async () => {
    mockSlotFindMany.mockResolvedValue([
      slotFixo({ id: 1 }),
      slotFixo({ id: 2 }),
    ]);
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = await recorrenciaService.expandirTodos({
      inicio: data(2026,0,1),
      fim: data(2026,0,31),
    });

    expect(res.totalSlots).toBe(2);
    expect(res.totalCriadas).toBe(8); // 4 segundas × 2 slots
  });
});

describe('recorrencia.service — obterInstancias', () => {
  it('retorna [] quando slot não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = await recorrenciaService.obterInstancias(999, {
      inicio: data(2026,0,1),
      fim: data(2026,0,31),
    });
    expect(res).toEqual([]);
  });

  it('expande slot FIXO e depois retorna instâncias do período', async () => {
    mockSlotFindUnique.mockResolvedValue(slotFixo({ id: 1 }));
    mockInstanciaCreate.mockResolvedValue({ id: 1 });
    mockInstanciaFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const res = await recorrenciaService.obterInstancias(1, {
      inicio: data(2026,0,1),
      fim: data(2026,0,31),
    });

    // FIXO → expandiu (criou) + consultou
    expect(mockInstanciaCreate).toHaveBeenCalled();
    expect(mockInstanciaFindMany).toHaveBeenCalled();
    expect(res).toHaveLength(2);
  });

  it('não expande (só consulta) para slot INDIVIDUAL', async () => {
    mockSlotFindUnique.mockResolvedValue(slotFixo({ id: 1, tipo: 'INDIVIDUAL', diaSemana: null }));
    mockInstanciaFindMany.mockResolvedValue([{ id: 7 }]);

    const res = await recorrenciaService.obterInstancias(1, {
      inicio: data(2026,0,1),
      fim: data(2026,0,31),
    });

    expect(mockInstanciaCreate).not.toHaveBeenCalled();
    expect(res).toEqual([{ id: 7 }]);
  });
});
