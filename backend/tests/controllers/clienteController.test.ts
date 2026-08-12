import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (antes do import dinâmico) ───
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    clientes: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}));

// cleanCPF real (apenas remove não-dígitos) — não precisa mockar
const {
  listar,
  buscarPorId,
  buscarPorDocumento,
  criar,
  atualizar,
  deletar,
} = await import('../../src/controllers/clienteController');
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

const clienteBase = {
  id: 1,
  nome: 'Maria',
  cpf: '12345678909',
  telefone: '99999',
  email: 'maria@x.com',
  createdAt: new Date(),
};

describe('clienteController.listar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna lista de clientes', async () => {
    mockFindMany.mockResolvedValue([clienteBase]);
    const res = mockRes();
    await listar(mockReq(), res);
    expect(res.json).toHaveBeenCalledWith([clienteBase]);
  });

  it('retorna 500 em erro', async () => {
    mockFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('clienteController.buscarPorId', () => {
  beforeEach(() => vi.clearAllMocks());

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

  it('retorna cliente com agendamentos e avaliações', async () => {
    const cliente = {
      ...clienteBase,
      agendamentos: [{ id: 1, passeio: { id: 2 } }],
      avaliacoes: [{ id: 1, passeio: { id: 3 } }],
    };
    mockFindUnique.mockResolvedValue(cliente);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    expect(res.json).toHaveBeenCalledWith(cliente);
  });
});

describe('clienteController.buscarPorDocumento', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita documento vazio', async () => {
    const res = mockRes();
    await buscarPorDocumento(mockReq({ params: { documento: '' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita documento curto (menos de 3 dígitos)', async () => {
    const res = mockRes();
    await buscarPorDocumento(mockReq({ params: { documento: '12' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Documento inválido') }),
    );
  });

  it('retorna 404 se não encontra', async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = mockRes();
    await buscarPorDocumento(mockReq({ params: { documento: '12345678909' } }), res);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cpf: '12345678909' } }),
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('busca por documento com máscara e retorna cliente', async () => {
    mockFindFirst.mockResolvedValue(clienteBase);
    const res = mockRes();
    await buscarPorDocumento(mockReq({ params: { documento: '123.456.789-09' } }), res);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cpf: '12345678909' } }),
    );
    expect(res.json).toHaveBeenCalledWith(clienteBase);
  });
});

describe('clienteController.criar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita campos obrigatórios', async () => {
    const res = mockRes();
    await criar(mockReq({ body: { nome: 'Maria' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita documento com tamanho diferente de 11 ou 14', async () => {
    const res = mockRes();
    await criar(
      mockReq({ body: { nome: 'Maria', cpf: '12345', telefone: '999' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('11 (CPF) ou 14 (CNPJ)') }),
    );
  });

  it('rejeita CPF já cadastrado', async () => {
    mockFindUnique.mockResolvedValue(clienteBase);
    const res = mockRes();
    await criar(
      mockReq({ body: { nome: 'Maria', cpf: '123.456.789-09', telefone: '999' } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('CPF já está cadastrado') }),
    );
  });

  it('rejeita email já em uso', async () => {
    // 1º findUnique (cpf) → null; 2º findUnique (email) → existente
    mockFindUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(clienteBase);
    const res = mockRes();
    await criar(
      mockReq({
        body: { nome: 'Maria', cpf: '12345678909', telefone: '999', email: 'maria@x.com' },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('E-mail já está em uso') }),
    );
  });

  it('cria cliente com sucesso e limpa CPF', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(clienteBase);
    const res = mockRes();
    await criar(
      mockReq({ body: { nome: 'Maria', cpf: '123.456.789-09', telefone: '999' } }),
      res,
    );
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.cpf).toBe('12345678909');
    expect(data.email).toBeNull();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('clienteController.atualizar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { nome: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejeita email já em uso por outro cliente', async () => {
    mockFindUnique.mockResolvedValue(clienteBase);
    mockFindFirst.mockResolvedValue({ id: 99 });
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { email: 'outro@x.com' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('E-mail já está em uso') }),
    );
  });

  it('atualiza campos fornecidos', async () => {
    mockFindUnique.mockResolvedValue(clienteBase);
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ ...clienteBase, nome: 'Maria Silva', telefone: '888' });
    const res = mockRes();
    await atualizar(
      mockReq({ params: { id: '5' }, body: { nome: 'Maria Silva', telefone: '888' } }),
      res,
    );
    const data = mockUpdate.mock.calls[0][0].data;
    expect(data.nome).toBe('Maria Silva');
    expect(data.telefone).toBe('888');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Maria Silva' }));
  });
});

describe('clienteController.deletar', () => {
  beforeEach(() => vi.clearAllMocks());

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
    mockFindUnique.mockResolvedValue(clienteBase);
    mockDelete.mockResolvedValue(clienteBase);
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(mockDelete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 5 } }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Cliente deletado com sucesso' }),
    );
  });

  it('retorna 400 quando há registros associados (P2003)', async () => {
    mockFindUnique.mockResolvedValue(clienteBase);
    mockDelete.mockRejectedValue({ code: 'P2003' });
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('agendamentos ou avaliações') }),
    );
  });

  it('retorna 500 em outro erro', async () => {
    mockFindUnique.mockResolvedValue(clienteBase);
    mockDelete.mockRejectedValue(new Error('db'));
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
