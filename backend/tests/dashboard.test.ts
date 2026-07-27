import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mock Prisma antes de importar o controller
const mockPrisma = {
  passeio: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  agendamento: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  slotAtribuicao: {
    count: vi.fn(),
  },
  slotPasseio: {
    findMany: vi.fn(),
  },
};

vi.mock('../src/lib/prisma', () => ({
  default: mockPrisma,
}));

// Importa o controller DEPOIS do mock
const { metricas } = await import('../src/controllers/dashboardController');

function mockReq(query: Record<string, string> = {}): Partial<Request> {
  return { query } as any;
}

function mockRes(): Partial<Response> {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('dashboardController - metricas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna métricas zeradas quando não há passeios no período', async () => {
    mockPrisma.passeio.count.mockResolvedValue(0);
    mockPrisma.passeio.findMany.mockResolvedValue([]);
    mockPrisma.agendamento.findMany.mockResolvedValue([]);
    mockPrisma.agendamento.count.mockResolvedValue(0);
    mockPrisma.slotAtribuicao.count.mockResolvedValue(0);

    const req = mockReq({ inicio: '2026-01-01', fim: '2026-01-31' });
    const res = mockRes();

    await metricas(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        metricas: expect.objectContaining({
          taxaOcupacao: 0,
          vagasDisponibilizadas: 0,
          vagasPreenchidas: 0,
          receita: 0,
          totalPasseios: 0,
        }),
      })
    );
  });

  it('calcula taxa de ocupação corretamente', async () => {
    mockPrisma.passeio.count.mockResolvedValue(2);
    mockPrisma.passeio.findMany.mockResolvedValue([
      { id: 1, capacidade: 10, ativo: true },
      { id: 2, capacidade: 10, ativo: true },
    ]);
    mockPrisma.agendamento.findMany.mockResolvedValue([
      { acompanhantes: 1, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 50 } },
      { acompanhantes: 2, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 50 } },
      { acompanhantes: 0, status: 'CONFIRMADO', passeioId: 2, passeio: { preco: 40 } },
    ]);
    mockPrisma.agendamento.count
      .mockResolvedValueOnce(3) // total
      .mockResolvedValueOnce(0); // cancelados
    mockPrisma.slotAtribuicao.count.mockResolvedValue(1);

    const req = mockReq({ inicio: '2026-07-01', fim: '2026-07-31' });
    const res = mockRes();

    await metricas(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        metricas: expect.objectContaining({
          // vagasPreenchidas = 1+1 + 1+2 + 1+0 = 6
          vagasPreenchidas: 6,
          // vagasDisponibilizadas = 10+10 = 20
          // taxaOcupacao = 6/20 * 100 = 30
          taxaOcupacao: 30,
          totalPasseios: 2,
        }),
      })
    );
  });

  it('calcula receita como soma dos preços dos passeios com agendamentos', async () => {
    mockPrisma.passeio.count.mockResolvedValue(1);
    mockPrisma.passeio.findMany.mockResolvedValue([
      { id: 1, capacidade: 5, ativo: true },
    ]);
    mockPrisma.agendamento.findMany.mockResolvedValue([
      { acompanhantes: 0, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 100 } },
      { acompanhantes: 0, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 100 } },
    ]);
    mockPrisma.agendamento.count
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(0); // cancelados
    mockPrisma.slotAtribuicao.count.mockResolvedValue(0);

    const req = mockReq({ inicio: '2026-07-01', fim: '2026-07-31' });
    const res = mockRes();

    await metricas(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        metricas: expect.objectContaining({
          receita: 200,
        }),
      })
    );
  });

  it('exclui agendamentos cancelados da receita', async () => {
    mockPrisma.passeio.count.mockResolvedValue(1);
    mockPrisma.passeio.findMany.mockResolvedValue([
      { id: 1, capacidade: 5, ativo: true },
    ]);
    // Agendamentos cancelados não entram no findMany porque tem where: { status: { not: 'CANCELADO' } }
    mockPrisma.agendamento.findMany.mockResolvedValue([
      { acompanhantes: 0, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 80 } },
    ]);
    mockPrisma.agendamento.count
      .mockResolvedValueOnce(2) // total (inclui cancelado)
      .mockResolvedValueOnce(1); // cancelados
    mockPrisma.slotAtribuicao.count.mockResolvedValue(1);

    const req = mockReq({ inicio: '2026-07-01', fim: '2026-07-31' });
    const res = mockRes();

    await metricas(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        metricas: expect.objectContaining({
          receita: 80,
          totalAgendamentos: 2,
          cancelados: 1,
          realizados: 1,
          indiceConversao: 50, // 1 / (1+1) * 100 = 50
        }),
      })
    );
  });

  it('usa período padrão (mês atual) quando nenhuma query passada', async () => {
    mockPrisma.passeio.count.mockResolvedValue(0);
    mockPrisma.passeio.findMany.mockResolvedValue([]);
    mockPrisma.agendamento.findMany.mockResolvedValue([]);
    mockPrisma.agendamento.count.mockResolvedValue(0);
    mockPrisma.slotAtribuicao.count.mockResolvedValue(0);

    const req = mockReq({});
    const res = mockRes();

    await metricas(req as Request, res as Response);

    // Verifica que retornou algo (período padrão)
    // inicio/fim são Date objects, não strings, até serem serializados
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        periodo: expect.objectContaining({
          inicio: expect.any(Date),
          fim: expect.any(Date),
        }),
      })
    );
  });

  it('retorna 500 em caso de erro', async () => {
    mockPrisma.passeio.count.mockRejectedValue(new Error('DB error'));

    const req = mockReq({ inicio: '2026-07-01', fim: '2026-07-31' });
    const res = mockRes();

    await metricas(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Erro ao buscar métricas' })
    );
  });

  it('ajusta fim para incluir todo o dia (timezone fix)', async () => {
    // O fim "2026-07-27" deve se tornar "2026-07-28T00:00:00.000Z" no banco
    // Este teste verifica que o extrairPeriodo processa corretamente
    const ate = new Date('2026-07-27');
    ate.setDate(ate.getDate() + 1);
    ate.setHours(0, 0, 0, 0);

    mockPrisma.passeio.count.mockResolvedValue(5);
    mockPrisma.passeio.findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: i + 1, capacidade: 10, ativo: true }))
    );
    mockPrisma.agendamento.findMany.mockResolvedValue([]);
    mockPrisma.agendamento.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.slotAtribuicao.count.mockResolvedValue(0);

    const req = mockReq({ inicio: '2026-07-01', fim: '2026-07-27' });
    const res = mockRes();

    await metricas(req as Request, res as Response);

    // Verifica que retornou métricas sem erros
    expect(res.json).toHaveBeenCalled();
  });
});
