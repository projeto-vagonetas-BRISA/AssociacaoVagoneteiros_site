import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPasseioCount = vi.fn();
const mockPasseioFindMany = vi.fn();
const mockAgendamentoFindMany = vi.fn();
const mockAgendamentoCount = vi.fn();
const mockAtribuicaoCount = vi.fn();

const prismaMock = {
  passeio: {
    count: mockPasseioCount,
    findMany: mockPasseioFindMany,
  },
  agendamento: {
    findMany: mockAgendamentoFindMany,
    count: mockAgendamentoCount,
  },
  slotAtribuicao: {
    count: mockAtribuicaoCount,
  },
};

vi.mock('../../src/lib/prisma', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

const { metricas, picosDemanda, faturamento } = await import('../../src/controllers/dashboardController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, ...overrides } as any;
}

beforeEach(() => vi.clearAllMocks());

// Pré-condições default para metricas: sem passeios
function defaultMetricas() {
  mockPasseioCount.mockResolvedValue(0);
  mockPasseioFindMany.mockResolvedValue([]);
  mockAgendamentoFindMany.mockResolvedValue([]);
  mockAgendamentoCount.mockResolvedValue(0);
  mockAtribuicaoCount.mockResolvedValue(0);
}

describe('dashboardController.metricas', () => {
  it('retorna métricas zeradas quando não há passeios', async () => {
    defaultMetricas();
    const res = mockRes();
    await metricas(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31' } }), res);

    expect(res.status).not.toHaveBeenCalled();
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.metricas).toEqual({
      taxaOcupacao: 0,
      vagasDisponibilizadas: 0,
      vagasPreenchidas: 0,
      taxaCancelamento: 0,
      totalAgendamentos: 0,
      cancelados: 0,
      realizados: 0,
      indiceConversao: 0,
      receita: 0,
      totalPasseios: 0,
    });
    expect(payload.periodo).toBeDefined();
  });

  it('calcula ocupação, cancelamento, realizados e receita', async () => {
    defaultMetricas();
    // 2 passeios, capacidade 3 e 5 → 8 vagas
    mockPasseioCount.mockResolvedValue(2);
    mockPasseioFindMany.mockResolvedValue([
      { id: 1, capacidade: 3 },
      { id: 2, capacidade: 5 },
    ]);
    // 3 agendamentos preenchem: 1+2, 1+0, 1+1 → 6 vagas
    mockAgendamentoFindMany.mockResolvedValue([
      { acompanhantes: 2, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 10, status: 'REALIZADO' } },
      { acompanhantes: 0, status: 'CONFIRMADO', passeioId: 2, passeio: { preco: 20, status: 'REALIZADO' } },
      { acompanhantes: 1, status: 'CANCELADO', passeioId: 2, passeio: { preco: 20, status: 'REALIZADO' } },
    ]);
    mockAgendamentoCount
      .mockResolvedValueOnce(10) // total agendamentos
      .mockResolvedValueOnce(3); // cancelados
    mockAtribuicaoCount.mockResolvedValue(7); // realizados

    const res = mockRes();
    await metricas(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31' } }), res);

    const m = (res.json as any).mock.calls[0][0].metricas;
    expect(m.vagasDisponibilizadas).toBe(8);
    expect(m.vagasPreenchidas).toBe(6); // 3+1+2 (ignora cancelado? soma todos) → 3+1+2=6
    expect(m.taxaOcupacao).toBe(75); // 6/8
    // cancelados = agendamento.count com status CANCELADO
    expect(m.cancelados).toBe(3); // mockAgendamentoCount retorna 10 para total, mas cancelados usa count CANCELADO
    // (não temos mock distinto; o código chama agendamento.count 2x: total e cancelado)
    expect(m.totalAgendamentos).toBe(10);
    expect(m.realizados).toBe(7);
    expect(m.indiceConversao).toBe(70); // 7/(7+3)
    // receita: agendamentos não-cancelados com passeio REALIZADO: (10*3)+(20*1)=50
    expect(m.receita).toBe(50);
  });

  it('usa período padrão (mês atual) quando sem query', async () => {
    defaultMetricas();
    const res = mockRes();
    await metricas(mockReq({}), res);
    const payload = (res.json as any).mock.calls[0][0];
    const inicio = payload.periodo.inicio;
    expect(new Date(inicio).getDate()).toBe(1); // primeiro dia do mês
    expect(mockPasseioCount).toHaveBeenCalled();
  });

  it('retorna 500 em erro', async () => {
    mockPasseioCount.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await metricas(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('dashboardController.picosDemanda', () => {
  it('agrupa por dia, dia da semana e horário', async () => {
    // domingo 04/01/2026 08:30 com 1 acompanhante (2 pessoas)
    mockAgendamentoFindMany.mockResolvedValue([
      { passeio: { data: new Date(2026, 0, 4), horario: '08:30:00' }, acompanhantes: 1 },
      { passeio: { data: new Date(2026, 0, 4), horario: '08:30:00' }, acompanhantes: 0 },
    ]);

    const res = mockRes();
    await picosDemanda(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31' } }), res);

    const picos = (res.json as any).mock.calls[0][0].picos;
    // porDia e porHorario agrupam; porDiaSemana com chave 'Domingo' (04/01/26 é domingo)
    expect(picos.porDia[0].dia).toBe('2026-01-04');
    expect(picos.porDia[0].total).toBe(3);
    expect(picos.porHorario[0].horario).toBe('08:30');
    expect(picos.porHorario[0].total).toBe(3);
    expect(picos.porDiaSemana[0].dia).toBe('Domingo');
    expect(picos.porDiaSemana[0].total).toBe(3);
  });

  it('retorna 500 em erro', async () => {
    mockAgendamentoFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await picosDemanda(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('dashboardController.faturamento', () => {
  it('agrupa por vagoneteiro e calcula total', async () => {
    mockPasseioFindMany.mockResolvedValue([
      {
        id: 1,
        titulo: 'Passeio 1',
        horario: '08:00',
        preco: 10,
        data: new Date(2026, 0, 5),
        usuario: { id: 7, name: 'João' },
        agendamentos: [{ acompanhantes: 2 }, { acompanhantes: 0 }], // 3+1 = 4 pessoas
      },
      {
        id: 2,
        titulo: 'Passeio 2',
        horario: '09:00',
        preco: 20,
        data: new Date(2026, 0, 6),
        usuario: { id: 7, name: 'João' },
        agendamentos: [{ acompanhantes: 1 }], // 2 pessoas
      },
    ]);

    const res = mockRes();
    await faturamento(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31' } }), res);

    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.totalGeral).toBe((10 * 4) + (20 * 2)); // 40 + 40 = 80
    expect(payload.vagoneteiros).toHaveLength(1);
    expect(payload.vagoneteiros[0].nome).toBe('João');
    expect(payload.vagoneteiros[0].passeios).toHaveLength(2);
    // ordenação default por data desc (sem ordenar) → sem reordenação de total
  });

  it('ordena por total quando ordenar=total', async () => {
    mockPasseioFindMany.mockResolvedValue([
      {
        id: 1, preco: 10, horario: '08:00', data: new Date(2026, 0, 5),
        usuario: { id: 1, name: 'A' },
        agendamentos: [{ acompanhantes: 9 }], // 10 pessoas → 100
      },
      {
        id: 2, preco: 10, horario: '08:00', data: new Date(2026, 0, 6),
        usuario: { id: 2, name: 'B' },
        agendamentos: [{ acompanhantes: 0 }], // 1 pessoa → 10
      },
    ]);

    const res = mockRes();
    await faturamento(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31', ordenar: 'total' } }), res);

    const v = (res.json as any).mock.calls[0][0].vagoneteiros;
    expect(v[0].nome).toBe('A'); // maior total primeiro
    expect(v[1].nome).toBe('B');
  });

  it('ignora passeios sem usuario vinculado', async () => {
    mockPasseioFindMany.mockResolvedValue([
      {
        id: 1, preco: 10, horario: '08:00', data: new Date(2026, 0, 5),
        usuario: null,
        agendamentos: [],
      },
    ]);
    const res = mockRes();
    await faturamento(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31' } }), res);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.vagoneteiros).toHaveLength(0);
    expect(payload.totalGeral).toBe(0);
    // ainda busca com filtro REALIZADO
    expect(mockPasseioFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'REALIZADO', ativo: true }) }),
    );
  });

  it('retorna 500 em erro', async () => {
    mockPasseioFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await faturamento(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
