import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───
const mockFindUnique = vi.fn(); // slotInstancia.findUnique
const mockCount = vi.fn();      // slotAtribuicao.count
const mockFindFirst = vi.fn();  // slotAtribuicao.findFirst + passeio.findFirst
const mockCreate = vi.fn();     // slotAtribuicao.create
const mockUpdate = vi.fn();     // slotInstancia.update + passeio.update
const mockPasseioCreate = vi.fn();
const mockUpdateMany = vi.fn(); // agendamento.updateMany

const mockVerificarConflito = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    slotInstancia: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
    slotAtribuicao: {
      count: mockCount,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
    passeio: {
      findFirst: mockFindFirst,
      create: mockPasseioCreate,
      update: mockUpdate,
    },
    agendamento: {
      updateMany: mockUpdateMany,
    },
  },
}));

vi.mock('../../src/services/agendamento.service', () => ({
  conflitoService: {
    verificarConflitoVagoneteiro: (...args: any[]) => mockVerificarConflito(...args),
  },
}));

const { autoAtribuir, realizarAtribuicao } = await import('../../src/controllers/atribuicaoController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(body: Record<string, any> = {}) {
  return { body, user: { id: 7, perfil: 'VAGONETEIRO' } } as any;
}

function instanciaValida() {
  return {
    id: 10,
    data: new Date('2026-12-20'),
    horaInicio: '09:00',
    horaFim: '10:00',
    status: 'AGENDADO',
    slotPasseioId: 3,
    slotPasseio: {
      id: 3,
      titulo: 'Passeio',
      horaInicio: '09:00',
      horaFim: '10:00',
      capacidade: 5,
      valor: 50,
      _count: { atribuicoes: 0 },
    },
  };
}

describe('atribuicaoController.autoAtribuir', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindUnique.mockResolvedValue(instanciaValida());
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null);
    mockVerificarConflito.mockResolvedValue([]);
    mockCreate.mockResolvedValue({
      id: 100,
      slotPasseioId: 3,
      instanciaId: 10,
      vagoneteiroId: 7,
      status: 'ATRIBUIDO',
    });
  });

  it('rejeita quando instanciaId não é informado', async () => {
    const res = mockRes();
    await autoAtribuir(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('instanciaId') }),
    );
  });

  it('retorna 404 quando instância não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 999 }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('não encontrada') }),
    );
  });

  it('rejeita instância cancelada ou realizada', async () => {
    const inst = instanciaValida();
    inst.status = 'CANCELADO';
    mockFindUnique.mockResolvedValue(inst);
    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 10 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('cancelada') }),
    );
  });

  it('rejeita atribuição em instância já pega por outro vagoneteiro', async () => {
    mockCount.mockResolvedValue(1); // já tem atribuído/realizado
    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 10 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('pego por outro') }),
    );
  });

  it('rejeita quando vagoneteiro já está atribuído à instância', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValueOnce({ id: 55 }); // jaAtribuido
    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 10 }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('já está atribuído') }),
    );
  });

  it('rejeita nova atribuição enquanto tem outra pendente em outro passeio (regra: conclua antes)', async () => {
    mockCount.mockResolvedValue(0);
    // 1ª chamada (jaAtribuido p/ mesma instancia) = null; 2ª chamada (pendente em outro passeio) = objeto
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 77,
        slotPasseio: { titulo: 'Passeio 08:00' },
        instancia: { data: new Date('2026-12-22T03:00:00.000Z'), horaInicio: '08:00' },
      });
    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 10 }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Conclua-o antes de se atribuir a um novo'),
        atribuicaoPendenteId: 77,
      }),
    );
  });


  it('retorna 409 em conflito de horário com outra atribuição', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null); // não há outra atribuição do vagoneteiro
    mockVerificarConflito.mockResolvedValue([
      { tipo: 'HORARIO', mensagem: 'Vagoneteiro já tem compromisso das 08:00 às 09:30' },
    ]);

    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 10 }), res);
    expect(res.status).toHaveBeenCalledWith(409);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.message).toContain('Conflito');
    expect(payload.conflitos).toHaveLength(1);
  });

  it('atribui com sucesso e cria passeio público quando não existe equivalente', async () => {
    mockCount.mockResolvedValue(0);
    mockFindFirst.mockResolvedValue(null); // nenhum passeio público equivalente
    const res = mockRes();
    await autoAtribuir(mockReq({ instanciaId: 10 }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockCreate).toHaveBeenCalled();
    // cria passeio com dados do slot
    expect(mockPasseioCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          capacidade: 5,
          preco: 50,
          usuarioId: 7,
        }),
      }),
    );
  });
});

describe('atribuicaoController.realizarAtribuicao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({});
    mockUpdateMany.mockResolvedValue({ count: 0 });
  });

  function atribuicaoPendente() {
    return {
      id: 7,
      vagoneteiroId: 40,
      status: 'ATRIBUIDO',
      instanciaId: 4,
      instancia: { data: new Date('2026-12-14T03:00:00.000Z'), horaInicio: '08:00' },
      slotPasseioId: 4,
    };
  }

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await realizarAtribuicao({ params: { id: 'abc' }, user: { id: 40 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando atribuição não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await realizarAtribuicao({ params: { id: '999' }, user: { id: 40 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejeita atribuição já realizada', async () => {
    const attr = atribuicaoPendente();
    attr.status = 'REALIZADO';
    mockFindUnique.mockResolvedValue(attr);
    const res = mockRes();
    await realizarAtribuicao({ params: { id: '7' }, user: { id: 40 } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('já está como realizada') }),
    );
  });

  it('marca atribuição, instância e passeio como REALIZADO quando não há pendentes', async () => {
    mockFindUnique.mockResolvedValue(atribuicaoPendente());
    mockUpdate.mockResolvedValue({ id: 7, instanciaId: 4, status: 'REALIZADO' }); // slotAtribuicao.update
    mockCount.mockResolvedValue(0); // nenhuma atribuição ATRIBUIDO restante na instância
    // passeio.findFirst por slotInstanciaId → encontra passeio 2957
    mockFindFirst.mockResolvedValueOnce({ id: 2957, status: 'CONFIRMADO' });

    const res = mockRes();
    await realizarAtribuicao({ params: { id: '7' }, user: { id: 40 } } as any, res);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REALIZADO' }) }),
    );
    // instância marcada como REALIZADO (mockUpdate segunda chamada)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REALIZADO' }) }),
    );
    // passeio marcado como REALIZADO
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REALIZADO' }) }),
    );
    // agendamentos do passeio marcados como REALIZADO
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ passeioId: 2957 }),
        data: expect.objectContaining({ status: 'REALIZADO' }),
      }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('realizados') }),
    );
  });
});
