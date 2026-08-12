import { describe, it, expect, vi, beforeEach } from 'vitest';

const StatusPasseio = { CONFIRMADO: 'CONFIRMADO', REALIZADO: 'REALIZADO', CANCELADO: 'CANCELADO' } as const;

const mockPasseioFindMany = vi.fn();
const mockPasseioCount = vi.fn();
const mockPasseioFindUnique = vi.fn();
const mockPasseioCreate = vi.fn();
const mockPasseioUpdate = vi.fn();
const mockAgendamentoUpdateMany = vi.fn();
const mockSlotInstanciaUpdate = vi.fn();
const mockSlotAtribuicaoUpdateMany = vi.fn();

vi.mock('@prisma/client', () => ({
  StatusPasseio,
  Prisma: { PasseioWhereInput: class {} },
}));

const prismaMock = {
  passeio: {
    findMany: mockPasseioFindMany,
    count: mockPasseioCount,
    findUnique: mockPasseioFindUnique,
    create: mockPasseioCreate,
    update: mockPasseioUpdate,
  },
  agendamento: { updateMany: mockAgendamentoUpdateMany },
  slotInstancia: { update: mockSlotInstanciaUpdate },
  slotAtribuicao: { updateMany: mockSlotAtribuicaoUpdateMany },
};

vi.mock('../../src/lib/prisma', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

const {
  listar,
  buscarPorId,
  criar,
  atualizar,
  atualizarStatus,
  deletar,
} = await import('../../src/controllers/passeioController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1, perfil: 'ADMIN', cpf: '123' }, ...overrides } as any;
}

const passeioBase: any = {
  id: 1,
  preco: 25,
  capacidade: 4,
  data: new Date(Date.now() + 86400000), // amanhã
  horario: '08:00',
  status: 'CONFIRMADO',
  ativo: true,
  usuarioId: 1,
  slotInstanciaId: null,
};

function amanhaISO(): string {
  return new Date(Date.now() + 86400000).toISOString().split('T')[0];
}
function ontemISO(): string {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0];
}

beforeEach(() => vi.clearAllMocks());

describe('passeioController.listar', () => {
  it('retorna passeios paginados com total', async () => {
    mockPasseioFindMany.mockResolvedValue([passeioBase]);
    mockPasseioCount.mockResolvedValue(1);
    const res = mockRes();
    await listar(mockReq({ query: { page: '1', limit: '10' } }), res);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data).toHaveLength(1);
    expect(payload.total).toBe(1);
    expect(payload.totalPages).toBe(1);
    expect(payload.page).toBe(1);
    expect(payload.limit).toBe(10);
  });

  it('aplica filtro de data quando inicio/fim fornecidos', async () => {
    mockPasseioFindMany.mockResolvedValue([]);
    mockPasseioCount.mockResolvedValue(0);
    const res = mockRes();
    await listar(mockReq({ query: { inicio: '2026-01-01', fim: '2026-01-31' } }), res);
    const args = mockPasseioFindMany.mock.calls[0][0];
    expect(args.where.data).toBeDefined();
    expect(args.where.ativo).toBe(true);
  });

  it('limita page/limit (max 200, min 1)', async () => {
    mockPasseioFindMany.mockResolvedValue([]);
    mockPasseioCount.mockResolvedValue(0);
    const res = mockRes();
    await listar(mockReq({ query: { page: '0', limit: '9999' } }), res);
    const args = mockPasseioFindMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(200);
  });

  it('retorna 500 em erro', async () => {
    mockPasseioFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await listar(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('passeioController.buscarPorId', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockPasseioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna passeio com relacionamentos', async () => {
    const p = { ...passeioBase, usuario: {}, agendamentos: [], avaliacoes: [] };
    mockPasseioFindUnique.mockResolvedValue(p);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.json).toHaveBeenCalledWith(p);
  });
});

describe('passeioController.criar', () => {
  it('rejeita campos obrigatórios', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { preco: '10' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita preço inválido (<=0)', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { preco: '0', capacidade: '4', data: amanhaISO() } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita capacidade inválida', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { preco: '10', capacidade: 'abc', data: amanhaISO() } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita data no passado', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { preco: '10', capacidade: '4', data: ontemISO() } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('data passada') }),
    );
  });

  it('cria passeio vinculado ao usuário logado (USUARIO ignora usuarioId)', async () => {
    mockPasseioCreate.mockResolvedValue(passeioBase);
    const res = mockRes();
    await criar(
      mockReq({
        user: { id: 3, perfil: 'USUARIO' },
        body: { preco: '25', capacidade: '4', data: amanhaISO(), usuarioId: '999' },
      }),
      res,
    );
    const data = mockPasseioCreate.mock.calls[0][0].data;
    expect(data.usuarioId).toBe(3); // forçado ao usuário logado
    expect(data.preco).toBe(25);
    expect(data.capacidade).toBe(4);
    expect(data.horario).toBe('08:00');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('ADMIN pode criar para outro usuarioId', async () => {
    mockPasseioCreate.mockResolvedValue(passeioBase);
    const res = mockRes();
    await criar(
      mockReq({
        user: { id: 1, perfil: 'ADMIN' },
        body: { preco: '25', capacidade: '4', data: amanhaISO(), usuarioId: '50' },
      }),
      res,
    );
    expect(mockPasseioCreate.mock.calls[0][0].data.usuarioId).toBe(50);
  });
});

describe('passeioController.atualizar', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockPasseioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('USUARIO (não dono) recebe 403', async () => {
    mockPasseioFindUnique.mockResolvedValue({ ...passeioBase, usuarioId: 99 });
    const res = mockRes();
    await atualizar(
      mockReq({ user: { id: 3, perfil: 'USUARIO' }, params: { id: '5' }, body: { preco: '30' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('atualiza preço/capacidade/data/horario fornecidos', async () => {
    mockPasseioFindUnique.mockResolvedValue(passeioBase);
    mockPasseioUpdate.mockResolvedValue({ ...passeioBase, preco: 30, capacidade: 6 });
    const res = mockRes();
    await atualizar(
      mockReq({ params: { id: '5' }, body: { preco: '30', capacidade: '6', horario: '10:00' } }),
      res,
    );
    const data = mockPasseioUpdate.mock.calls[0][0].data;
    expect(data.preco).toBe(30);
    expect(data.capacidade).toBe(6);
    expect(data.horario).toBe('10:00');
  });

  it('rejeita data passada na atualização', async () => {
    mockPasseioFindUnique.mockResolvedValue(passeioBase);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { data: ontemISO() } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('data passada') }),
    );
  });
});

describe('passeioController.atualizarStatus', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizarStatus(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita status inválido', async () => {
    const res = mockRes();
    await atualizarStatus(mockReq({ params: { id: '5' }, body: { status: 'INVALIDO' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Status inválido') }),
    );
  });

  it('retorna 404 se não existe', async () => {
    mockPasseioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizarStatus(mockReq({ params: { id: '5' }, body: { status: 'CONFIRMADO' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('só atualiza status (CONFIRMADO) sem propagar agendamentos', async () => {
    mockPasseioFindUnique.mockResolvedValue(passeioBase);
    mockPasseioUpdate.mockResolvedValue({ ...passeioBase, status: 'CONFIRMADO' });
    const res = mockRes();
    await atualizarStatus(mockReq({ params: { id: '5' }, body: { status: 'CONFIRMADO' } }), res);
    expect(mockAgendamentoUpdateMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMADO' }));
  });

  it('propaga CANCELADO para agendamentos e instância vinculada', async () => {
    mockPasseioFindUnique.mockResolvedValue({ ...passeioBase, slotInstanciaId: 42 });
    mockPasseioUpdate.mockResolvedValue({ ...passeioBase, status: 'CANCELADO' });
    const res = mockRes();
    await atualizarStatus(
      mockReq({ params: { id: '5' }, body: { status: 'CANCELADO', motivo: 'Chuva' } }),
      res,
    );
    // agendamentos atualizados com cancelamento + auditoria
    expect(mockAgendamentoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CANCELADO',
          canceladoEm: expect.any(Date),
          canceladoPor: '123',
          motivoCancelamento: 'Chuva',
        }),
      }),
    );
    // instância e atribuições vinculadas
    expect(mockSlotInstanciaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELADO' } }),
    );
    expect(mockSlotAtribuicaoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELADO' } }),
    );
  });

  it('propaga REALIZADO para agendamentos e atribuições', async () => {
    mockPasseioFindUnique.mockResolvedValue({ ...passeioBase, slotInstanciaId: 42 });
    mockPasseioUpdate.mockResolvedValue({ ...passeioBase, status: 'REALIZADO' });
    const res = mockRes();
    await atualizarStatus(mockReq({ params: { id: '5' }, body: { status: 'REALIZADO' } }), res);
    expect(mockAgendamentoUpdateMany).toHaveBeenCalled();
    expect(mockSlotInstanciaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REALIZADO' } }),
    );
    expect(mockSlotAtribuicaoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REALIZADO' } }),
    );
  });
});

describe('passeioController.deletar', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await deletar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockPasseioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('USUARIO (não dono) recebe 403', async () => {
    mockPasseioFindUnique.mockResolvedValue({ ...passeioBase, usuarioId: 99 });
    const res = mockRes();
    await deletar(mockReq({ user: { id: 3, perfil: 'USUARIO' }, params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('cancela passeio, agendamentos e instância vinculada', async () => {
    mockPasseioFindUnique.mockResolvedValue({ ...passeioBase, slotInstanciaId: 42 });
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' }, body: { motivo: 'Condição climática' } }), res);

    expect(mockPasseioUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELADO' } }),
    );
    expect(mockAgendamentoUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELADO', motivoCancelamento: 'Condição climática' }),
      }),
    );
    expect(mockSlotInstanciaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELADO' } }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Passeio cancelado com sucesso' }),
    );
  });

  it('cancela sem instância vinculada', async () => {
    mockPasseioFindUnique.mockResolvedValue(passeioBase);
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(mockPasseioUpdate).toHaveBeenCalled();
    expect(mockSlotInstanciaUpdate).not.toHaveBeenCalled();
  });
});
