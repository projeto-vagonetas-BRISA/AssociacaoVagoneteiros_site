import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockClienteFindUnique = vi.fn();
const mockPasseioFindUnique = vi.fn();
const mockAgendamentoFindFirst = vi.fn();

const prismaMock = {
  avaliacao: {
    findMany: mockFindMany,
    findUnique: mockFindUnique,
    findFirst: mockFindFirst,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
  clientes: { findUnique: mockClienteFindUnique },
  passeio: { findUnique: mockPasseioFindUnique },
  agendamento: { findFirst: mockAgendamentoFindFirst },
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
  deletar,
} = await import('../../src/controllers/avaliacaoController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1, perfil: 'ADMIN' }, ...overrides } as any;
}

const avaliacaoBase: any = {
  id: 5,
  nota: 5,
  comentario: 'Ótimo',
  clienteId: 1,
  passeioId: 2,
  createdAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe('avaliacaoController.listar', () => {
  it('retorna lista de avaliações', async () => {
    mockFindMany.mockResolvedValue([avaliacaoBase]);
    const res = mockRes();
    await listar(mockReq(), res);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
    expect(res.json).toHaveBeenCalledWith([avaliacaoBase]);
  });

  it('retorna 500 em erro', async () => {
    mockFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('avaliacaoController.buscarPorId', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: 'abc' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('retorna avaliação com relacionamentos', async () => {
    const a = { ...avaliacaoBase, cliente: {}, passeio: {} };
    mockFindUnique.mockResolvedValue(a);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.json).toHaveBeenCalledWith(a);
  });
});

describe('avaliacaoController.criar', () => {
  it('rejeita campos obrigatórios', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita nota fora do intervalo 1-5', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { nota: '6', clienteId: '1', passeioId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('entre 1 e 5') }),
    );
  });

  it('rejeita IDs inválidos', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5', clienteId: 'x', passeioId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se cliente não existe', async () => {
    mockClienteFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5', clienteId: '1', passeioId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Cliente não encontrado') }),
    );
  });

  it('retorna 404 se passeio não existe', async () => {
    mockClienteFindUnique.mockResolvedValue({ id: 1 });
    mockPasseioFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5', clienteId: '1', passeioId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Passeio não encontrado') }),
    );
  });

  it('rejeita quando cliente não tem agendamento confirmado', async () => {
    mockClienteFindUnique.mockResolvedValue({ id: 1 });
    mockPasseioFindUnique.mockResolvedValue({ id: 2 });
    mockAgendamentoFindFirst.mockResolvedValue(null);
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5', clienteId: '1', passeioId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('não possui um agendamento confirmado') }),
    );
  });

  it('rejeita avaliação duplicada', async () => {
    mockClienteFindUnique.mockResolvedValue({ id: 1 });
    mockPasseioFindUnique.mockResolvedValue({ id: 2 });
    mockAgendamentoFindFirst.mockResolvedValue({ id: 9 }); // confirmado
    mockFindFirst.mockResolvedValue(avaliacaoBase); // já avaliou
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5', clienteId: '1', passeioId: '2' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('já avaliou') }),
    );
  });

  it('cria avaliação com sucesso', async () => {
    mockClienteFindUnique.mockResolvedValue({ id: 1 });
    mockPasseioFindUnique.mockResolvedValue({ id: 2 });
    mockAgendamentoFindFirst.mockResolvedValue({ id: 9 });
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue(avaliacaoBase);
    const res = mockRes();
    await criar(mockReq({ body: { nota: '5', comentario: 'Ótimo', clienteId: '1', passeioId: '2' } }), res);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.nota).toBe(5);
    expect(data.clienteId).toBe(1);
    expect(data.passeioId).toBe(2);
    expect(data.comentario).toBe('Ótimo');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('avaliacaoController.atualizar', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { nota: '4' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejeita nota inválida na atualização', async () => {
    mockFindUnique.mockResolvedValue(avaliacaoBase);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { nota: '0' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('atualiza nota e comentário', async () => {
    mockFindUnique.mockResolvedValue(avaliacaoBase);
    mockUpdate.mockResolvedValue({ ...avaliacaoBase, nota: 4, comentario: 'Bom' });
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { nota: '4', comentario: 'Bom' } }), res);
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.nota).toBe(4);
    expect(data.comentario).toBe('Bom');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nota: 4 }));
  });

  it('atualiza apenas comentário quando nota não fornecida', async () => {
    mockFindUnique.mockResolvedValue(avaliacaoBase);
    mockUpdate.mockResolvedValue({ ...avaliacaoBase, comentario: 'Novo comentário' });
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { comentario: 'Novo comentário' } }), res);
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.nota).toBeUndefined();
    expect(data.comentario).toBe('Novo comentário');
  });
});

describe('avaliacaoController.deletar', () => {
  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await deletar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deleta com sucesso', async () => {
    mockFindUnique.mockResolvedValue(avaliacaoBase);
    mockDelete.mockResolvedValue(avaliacaoBase);
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 } }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Avaliação deletada com sucesso' }),
    );
  });

  it('retorna 500 em erro', async () => {
    mockFindUnique.mockResolvedValue(avaliacaoBase);
    mockDelete.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
