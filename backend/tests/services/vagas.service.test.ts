import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  passeio: {
    findUnique: vi.fn(),
  },
  agendamento: {
    findMany: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma', () => ({
  default: mockPrisma,
}));

const { calcularVagasDisponiveis } = await import('../../src/services/vagas.service');

describe('services/vagas.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna capacidade e vagas quando passeio existe', async () => {
    mockPrisma.passeio.findUnique.mockResolvedValue({ capacidade: 10 });
    mockPrisma.agendamento.findMany.mockResolvedValue([
      { acompanhantes: 1 },
      { acompanhantes: 0 },
      { acompanhantes: 3 },
    ]);

    const result = await calcularVagasDisponiveis(1);
    // ocupadas = (1+1) + (1+0) + (1+3) = 2 + 1 + 4 = 7
    expect(result).toEqual({ ocupadas: 7, disponiveis: 3, capacidade: 10 });
  });

  it('conta cliente + acompanhantes de cada agendamento', async () => {
    mockPrisma.passeio.findUnique.mockResolvedValue({ capacidade: 5 });
    mockPrisma.agendamento.findMany.mockResolvedValue([
      { acompanhantes: 4 }, // 1 + 4 = 5
    ]);

    const result = await calcularVagasDisponiveis(1);
    expect(result).toEqual({ ocupadas: 5, disponiveis: 0, capacidade: 5 });
  });

  it('retorna tudo zerado quando passeio não existe', async () => {
    mockPrisma.passeio.findUnique.mockResolvedValue(null);
    mockPrisma.agendamento.findMany.mockResolvedValue([{ acompanhantes: 2 }]);

    const result = await calcularVagasDisponiveis(999);
    expect(result).toEqual({ ocupadas: 0, disponiveis: 0, capacidade: 0 });
  });

  it('retorna 100% disponível quando não há agendamentos', async () => {
    mockPrisma.passeio.findUnique.mockResolvedValue({ capacidade: 8 });
    mockPrisma.agendamento.findMany.mockResolvedValue([]);

    const result = await calcularVagasDisponiveis(1);
    expect(result).toEqual({ ocupadas: 0, disponiveis: 8, capacidade: 8 });
  });
});
