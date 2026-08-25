import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
const mockPasseioFindFirst = vi.fn();
const mockPasseioCreate = vi.fn();
const mockPasseioUpdate = vi.fn();
const mockAgendamentoUpdateMany = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    passeio: {
      findFirst: mockPasseioFindFirst,
      create: mockPasseioCreate,
      update: mockPasseioUpdate,
    },
    agendamento: {
      updateMany: mockAgendamentoUpdateMany,
    },
  },
}));

const {
  sincronizarAposAtribuicao,
  sincronizarAposCancelamento,
  sincronizarAposRealizacao,
  contarVagasOcupadasDoPasseio,
} = await import('../../src/services/atribuicao.service');

const slot = {
  valor: { toNumber: () => 50 } as unknown,
  capacidade: 5,
  data: new Date('2026-12-20T00:00:00.000Z'),
  horaInicio: '09:00',
};

describe('atribuicao.service.sincronizarAposAtribuicao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('atualiza capacidade do passeio público quando já existe equivalente', async () => {
    mockPasseioFindFirst.mockResolvedValue({ id: 10, capacidade: 5 });
    await sincronizarAposAtribuicao({
      instanciaId: 1,
      vagoneteiroId: 7,
      valor: slot.valor as never,
      capacidade: 5,
      data: slot.data as Date,
      horaInicio: '09:00',
    });
    expect(mockPasseioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { capacidade: 10 },
      }),
    );
    expect(mockPasseioCreate).not.toHaveBeenCalled();
  });

  it('cria passeio público quando não existe equivalente', async () => {
    mockPasseioFindFirst.mockResolvedValue(null);
    await sincronizarAposAtribuicao({
      instanciaId: 1,
      vagoneteiroId: 7,
      valor: slot.valor as never,
      capacidade: 5,
      data: slot.data as Date,
      horaInicio: '09:00',
    });
    expect(mockPasseioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: 7,
          capacidade: 5,
          data: slot.data,
          horario: '09:00',
          status: 'CONFIRMADO',
          slotInstanciaId: 1,
        }),
      }),
    );
  });
});

describe('atribuicao.service.sincronizarAposCancelamento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna sem ação quando não há passeio equivalente', async () => {
    mockPasseioFindFirst.mockResolvedValue(null);
    await sincronizarAposCancelamento({ instanciaId: 1, capacidadeSlot: 5 });
    expect(mockPasseioUpdate).not.toHaveBeenCalled();
    expect(mockAgendamentoUpdateMany).not.toHaveBeenCalled();
  });

  it('cancela passeio e agendamentos quando capacidade zera', async () => {
    mockPasseioFindFirst.mockResolvedValue({ id: 10, capacidade: 5 });
    await sincronizarAposCancelamento({ instanciaId: 1, capacidadeSlot: 5 });
    expect(mockPasseioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: { capacidade: 0, status: 'CANCELADO' },
      }),
    );
    expect(mockAgendamentoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ passeioId: 10 }),
        data: { status: 'CANCELADO' },
      }),
    );
  });

  it('apenas reduz capacidade quando ainda resta vaga', async () => {
    mockPasseioFindFirst.mockResolvedValue({ id: 10, capacidade: 12 });
    await sincronizarAposCancelamento({ instanciaId: 1, capacidadeSlot: 5 });
    expect(mockPasseioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { capacidade: 7 } }),
    );
    expect(mockAgendamentoUpdateMany).not.toHaveBeenCalled();
  });
});

describe('atribuicao.service.sincronizarAposRealizacao', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca passeio e agendamentos como REALIZADO', async () => {
    mockPasseioFindFirst.mockResolvedValueOnce({ id: 10, status: 'CONFIRMADO' });
    await sincronizarAposRealizacao({
      instanciaId: 1,
      vagoneteiroId: 7,
      data: new Date('2026-12-20T00:00:00.000Z'),
      horaInicio: '09:00',
    });
    expect(mockPasseioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { status: 'REALIZADO' } }),
    );
    expect(mockAgendamentoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ passeioId: 10 }),
        data: { status: 'REALIZADO' },
      }),
    );
  });

  it('faz fallback por data+horário quando não acha por slotInstanciaId', async () => {
    mockPasseioFindFirst
      .mockResolvedValueOnce(null) // por slotInstanciaId
      .mockResolvedValueOnce({ id: 20, status: 'CONFIRMADO' }); // fallback por data/horário
    await sincronizarAposRealizacao({
      instanciaId: 1,
      vagoneteiroId: 7,
      data: new Date('2026-12-20T00:00:00.000Z'),
      horaInicio: '09:00',
    });
    expect(mockPasseioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 20 } }),
    );
  });

  it('não faz nada se instanciaId ou vagoneteiroId for null', async () => {
    await sincronizarAposRealizacao({
      instanciaId: null,
      vagoneteiroId: null,
      data: new Date('2026-12-20T00:00:00.000Z'),
      horaInicio: '09:00',
    });
    expect(mockPasseioFindFirst).not.toHaveBeenCalled();
  });
});

describe('atribuicao.service.contarVagasOcupadasDoPasseio', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna 0 quando não há passeio equivalente', async () => {
    mockPasseioFindFirst.mockResolvedValue(null);
    await expect(contarVagasOcupadasDoPasseio(1)).resolves.toBe(0);
  });

  it('retorna 0 quando instanciaId é null', async () => {
    await expect(contarVagasOcupadasDoPasseio(null)).resolves.toBe(0);
    expect(mockPasseioFindFirst).not.toHaveBeenCalled();
  });

  it('soma turista + acompanhantes dos agendamentos ativos', async () => {
    mockPasseioFindFirst.mockResolvedValue({
      id: 10,
      agendamentos: [
        { acompanhantes: 2 },
        { acompanhantes: 0 },
        { acompanhantes: 1 },
      ],
    });
    await expect(contarVagasOcupadasDoPasseio(1)).resolves.toBe(6); // 3 + 1 + 2
  });
});
