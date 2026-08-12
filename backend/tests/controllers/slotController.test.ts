import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Enums reais (o controller importa de '@prisma/client') ───
const TipoSlot = { FIXO: 'FIXO', LOTE: 'LOTE', INDIVIDUAL: 'INDIVIDUAL' } as const;
const DiaSemana = {
  SEGUNDA: 'SEGUNDA',
  TERCA: 'TERCA',
  QUARTA: 'QUARTA',
  QUINTA: 'QUINTA',
  SEXTA: 'SEXTA',
  SABADO: 'SABADO',
  DOMINGO: 'DOMINGO',
} as const;
const StatusSlot = { DISPONIVEL: 'DISPONIVEL', ATRIBUIDO: 'ATRIBUIDO', CANCELADO: 'CANCELADO', REALIZADO: 'REALIZADO' } as const;

// ─── Mocks do PrismaClient (slotController usa `new PrismaClient()`) ───
const mockSlotFindUnique = vi.fn();
const mockSlotFindMany = vi.fn();
const mockSlotCount = vi.fn();
const mockSlotCreate = vi.fn();
const mockSlotUpdate = vi.fn();
const mockInstanciaCreate = vi.fn();
const mockInstanciaFindMany = vi.fn();
const mockInstanciaUpdateMany = vi.fn();
const mockAtribuicaoUpdateMany = vi.fn();
const mockPasseioFindMany = vi.fn();
const mockPasseioUpdateMany = vi.fn();
const mockAgendamentoUpdateMany = vi.fn();
const mockUsuarioFindUnique = vi.fn();

// PrismaClient é usado com `new` no controller → precisa ser uma classe construtível
class MockPrismaClient {
  slotPasseio = {
    findUnique: mockSlotFindUnique,
    findMany: mockSlotFindMany,
    count: mockSlotCount,
    create: mockSlotCreate,
    update: mockSlotUpdate,
  };
  slotInstancia = {
    create: mockInstanciaCreate,
    findMany: mockInstanciaFindMany,
    updateMany: mockInstanciaUpdateMany,
  };
  slotAtribuicao = {
    updateMany: mockAtribuicaoUpdateMany,
  };
  passeio = {
    findMany: mockPasseioFindMany,
    updateMany: mockPasseioUpdateMany,
  };
  agendamento = {
    updateMany: mockAgendamentoUpdateMany,
  };
  usuario = {
    findUnique: mockUsuarioFindUnique,
  };
  $disconnect = vi.fn();
}

vi.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
  TipoSlot,
  DiaSemana,
  StatusSlot,
}));

// ─── Mocks dos services ───
const mockExpandirSlot = vi.fn();
const mockGerarLote = vi.fn();
const mockSlotFactoryCriar = vi.fn();

vi.mock('../../src/services/recorrencia.service', () => ({
  recorrenciaService: {
    expandirSlot: (...args: any[]) => mockExpandirSlot(...args),
    gerarLote: (...args: any[]) => mockGerarLote(...args),
  },
  horaParaMinutos: (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  },
  minutosParaHora: (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
}));

vi.mock('../../src/services/agendamento.service', () => ({
  SlotFactory: {
    criar: (...args: any[]) => mockSlotFactoryCriar(...args),
  },
}));

const {
  criar,
  listar,
  buscarPorId,
  atualizar,
  cancelar,
  expandir,
  gerarLote,
  listarInstancias,
  listarDisponiveis,
} = await import('../../src/controllers/slotController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(overrides: any = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id: 1, perfil: 'ADMIN' },
    ...overrides,
  } as any;
}

const slotBase = {
  id: 10,
  tipo: 'FIXO',
  titulo: 'Passeio de lancha',
  descricao: null,
  horaInicio: '08:00',
  horaFim: '09:30',
  duracaoMinutos: 90,
  diaSemana: 'SEGUNDA',
  dataInicio: new Date(),
  dataFim: null,
  intervaloDias: null,
  loteId: null,
  capacidade: 4,
  valor: 25,
  usuarioId: null,
  status: 'DISPONIVEL',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('slotController.criar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita quando faltam campos obrigatórios', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { tipo: 'FIXO', titulo: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('obrigatórios') }),
    );
  });

  it('rejeita tipo inválido', async () => {
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'INEXISTENTE',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('tipo inválido') }),
    );
  });

  it('rejeita slot FIXO sem diaSemana', async () => {
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'FIXO',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('diaSemana') }),
    );
  });

  it('rejeita slot FIXO com diaSemana inválido', async () => {
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'FIXO',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
          diaSemana: 'INVALIDO',
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('diaSemana inválido') }),
    );
  });

  it('rejeita slot INDIVIDUAL sem data', async () => {
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'INDIVIDUAL',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('data é obrigatória') }),
    );
  });

  it('rejeita quando o usuário vinculado não existe', async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'FIXO',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
          diaSemana: 'SEGUNDA',
          usuarioId: '999',
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('não encontrado') }),
    );
  });

  it('rejeita quando o usuário vinculado não é VAGONETEIRO', async () => {
    mockUsuarioFindUnique.mockResolvedValue({ id: 5, perfil: 'ADMIN' });
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'FIXO',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
          diaSemana: 'SEGUNDA',
          usuarioId: '5',
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('VAGONETEIRO') }),
    );
  });

  it('cria slot FIXO com sucesso e expande recorrência', async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);
    const slotCriado = { ...slotBase, id: 10 };
    mockSlotCreate.mockResolvedValue(slotCriado);
    mockSlotFindUnique.mockResolvedValue({ ...slotCriado, instancias: [] });
    mockExpandirSlot.mockResolvedValue({ criadas: 4, ignoradas: 0, instancias: [] });

    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'FIXO',
          titulo: 'Passeio de lancha',
          horaInicio: '08:00',
          horaFim: '09:30',
          capacidade: '4',
          valor: '25',
          diaSemana: 'SEGUNDA',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockSlotCreate).toHaveBeenCalledTimes(1);
    // verificar que perfil/diaSemana foram parseados
    const data = mockSlotCreate.mock.calls[0][0].data;
    expect(data.tipo).toBe('FIXO');
    expect(data.diaSemana).toBe('SEGUNDA');
    expect(data.capacidade).toBe(4);
    expect(data.valor).toBe(25);
    expect(data.duracaoMinutos).toBe(90);
    // slot FIXO deve ter expandido recorrência
    expect(mockExpandirSlot).toHaveBeenCalled();
    expect(mockSlotFindUnique).toHaveBeenCalled();
  });

  it('cria slot INDIVIDUAL com instância', async () => {
    mockSlotCreate.mockResolvedValue({ ...slotBase, id: 11, tipo: 'INDIVIDUAL', diaSemana: null });
    mockInstanciaCreate.mockResolvedValue({ id: 1 });

    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'INDIVIDUAL',
          titulo: 'Passeio único',
          horaInicio: '10:00',
          horaFim: '11:00',
          capacidade: '2',
          valor: '40',
          data: '2026-12-14',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockInstanciaCreate).toHaveBeenCalledTimes(1);
    expect(mockExpandirSlot).not.toHaveBeenCalled();
  });

  it('retorna 500 em erro de banco', async () => {
    mockSlotCreate.mockRejectedValue(new Error('db down'));
    const res = mockRes();
    await criar(
      mockReq({
        body: {
          tipo: 'FIXO',
          titulo: 'x',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: 4,
          valor: 25,
          diaSemana: 'SEGUNDA',
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('slotController.listar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna slots paginados com total', async () => {
    mockSlotFindMany.mockResolvedValue([slotBase, { ...slotBase, id: 11 }]);
    mockSlotCount.mockResolvedValue(2);

    const res = mockRes();
    await listar(mockReq({ query: { page: '1', limit: '10' } }), res);

    expect(res.status).not.toHaveBeenCalled();
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data).toHaveLength(2);
    expect(payload.total).toBe(2);
    expect(payload.totalPages).toBe(1);
    expect(payload.page).toBe(1);
  });

  it('aplica filtro de tipo quando válido', async () => {
    mockSlotFindMany.mockResolvedValue([]);
    mockSlotCount.mockResolvedValue(0);
    const res = mockRes();
    await listar(mockReq({ query: { tipo: 'FIXO' } }), res);
    const args = mockSlotFindMany.mock.calls[0][0];
    expect(args.where.tipo).toBe('FIXO');
  });

  it('limita paginação e página mínima', async () => {
    mockSlotFindMany.mockResolvedValue([]);
    mockSlotCount.mockResolvedValue(0);
    const res = mockRes();
    await listar(mockReq({ query: { page: '0', limit: '999' } }), res);
    const args = mockSlotFindMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50); // limit máximo 50
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.page).toBe(1);
  });

  it('retorna 500 em erro', async () => {
    mockSlotFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await listar(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('slotController.buscarPorId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna o slot quando existe', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.json).toHaveBeenCalledWith(slotBase);
    expect(mockSlotFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
  });
});

describe('slotController.atualizar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 quando não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { titulo: 'novo' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('atualiza campos fornecidos', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockSlotUpdate.mockResolvedValue({ ...slotBase, titulo: 'novo título', capacidade: 6 });
    const res = mockRes();
    await atualizar(
      mockReq({ params: { id: '5' }, body: { titulo: 'novo título', capacidade: '6', valor: '30' } }),
      res,
    );
    const data = mockSlotUpdate.mock.calls[0][0].data;
    expect(data.titulo).toBe('novo título');
    expect(data.capacidade).toBe(6);
    expect(data.valor).toBe(30);
    expect(data.status).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'novo título' }));
  });

  it('ignora status inválido', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockSlotUpdate.mockResolvedValue(slotBase);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { status: 'INVALIDO' } }), res);
    const data = mockSlotUpdate.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
  });
});

describe('slotController.cancelar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await cancelar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se slot não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await cancelar(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('cancela slot, instâncias futuras, atribuições e passeios/agendamentos', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockSlotUpdate.mockResolvedValue({ ...slotBase, status: 'CANCELADO' });
    mockInstanciaFindMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockPasseioFindMany.mockResolvedValue([{ id: 100 }]);

    const res = mockRes();
    await cancelar(mockReq({ params: { id: '5' } }), res);

    expect(mockSlotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELADO' } }),
    );
    expect(mockInstanciaUpdateMany).toHaveBeenCalled();
    expect(mockAtribuicaoUpdateMany).toHaveBeenCalled();
    expect(mockPasseioUpdateMany).toHaveBeenCalled();
    expect(mockAgendamentoUpdateMany).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Slot cancelado' }),
    );
  });

  it('cancela sem instâncias futuras (nenhuma ação extra)', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockSlotUpdate.mockResolvedValue({ ...slotBase, status: 'CANCELADO' });
    mockInstanciaFindMany.mockResolvedValue([]);
    const res = mockRes();
    await cancelar(mockReq({ params: { id: '5' } }), res);
    expect(mockInstanciaUpdateMany).not.toHaveBeenCalled();
    expect(mockPasseioUpdateMany).not.toHaveBeenCalled();
  });
});

describe('slotController.expandir', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await expandir(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se slot não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await expandir(mockReq({ params: { id: '5' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejeita expansão de slot não-FIXO', async () => {
    mockSlotFindUnique.mockResolvedValue({ ...slotBase, tipo: 'INDIVIDUAL' });
    const res = mockRes();
    await expandir(mockReq({ params: { id: '5' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FIXO') }),
    );
  });

  it('expande slot FIXO e retorna resultado', async () => {
    mockSlotFindUnique.mockResolvedValue({ ...slotBase, instancias: [] });
    mockExpandirSlot.mockResolvedValue({ criadas: 5, ignoradas: 1, instancias: [] });
    const res = mockRes();
    await expandir(mockReq({ params: { id: '5' }, body: {} }), res);
    expect(mockExpandirSlot).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ criadas: 5 }),
    );
  });
});

describe('slotController.gerarLote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita campos obrigatórios', async () => {
    const res = mockRes();
    await gerarLote(mockReq({ body: { titulo: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('gera lote com sucesso', async () => {
    mockGerarLote.mockResolvedValue([{ ...slotBase, id: 1 }, { ...slotBase, id: 2 }]);
    const res = mockRes();
    await gerarLote(
      mockReq({
        body: {
          titulo: 'Lote',
          horaInicio: '08:00',
          horaFim: '09:00',
          capacidade: '4',
          valor: '25',
        },
      }),
      res,
    );
    expect(mockGerarLote).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data).toHaveLength(2);
  });

  it('rejeita usuário vinculado inexistente no lote', async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await gerarLote(
      mockReq({
        body: {
          titulo: 'Lote',
          horaInicio: '08:00',
          capacidade: '4',
          valor: '25',
          usuarioId: '999',
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('slotController.listarInstancias', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await listarInstancias(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se slot não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await listarInstancias(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('usa SlotFactory e retorna instâncias', async () => {
    mockSlotFindUnique.mockResolvedValue({ ...slotBase, instancias: [] });
    mockSlotFactoryCriar.mockReturnValue({
      getInstancias: vi.fn().mockResolvedValue([{ id: 1 }]),
    });
    const res = mockRes();
    await listarInstancias(mockReq({ params: { id: '5' } }), res);
    expect(mockSlotFactoryCriar).toHaveBeenCalled();
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data).toHaveLength(1);
    expect(payload.total).toBe(1);
  });
});

describe('slotController.listarDisponiveis', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista slots disponíveis com instâncias', async () => {
    const slots = [{ ...slotBase, instancias: [{ id: 1 }] }];
    mockSlotFindMany.mockResolvedValue(slots);
    const res = mockRes();
    await listarDisponiveis(mockReq({ query: {} }), res);
    const args = mockSlotFindMany.mock.calls[0][0];
    expect(args.where.status).toBe('DISPONIVEL');
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data).toHaveLength(1);
  });
});
