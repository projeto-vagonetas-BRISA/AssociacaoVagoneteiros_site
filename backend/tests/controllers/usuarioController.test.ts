import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (antes do import dinâmico) ───
const mockFindMany = vi.fn();
const mockFindUnique = vi.fn();
const mockCount = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    usuario: {
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
      update: mockUpdate,
    },
  },
}));

vi.mock('../../src/utils/image', () => ({
  parseBase64Image: vi.fn().mockImplementation(() => Buffer.from('imagem')),
  fotoParaBase64: vi.fn().mockImplementation((foto: any) =>
    foto ? Buffer.from(foto).toString('base64') : null,
  ),
}));

const {
  listar,
  listarVagoneteiros,
  buscarPorId,
  atualizarPerfil,
  atualizar,
  alternarAtivo,
  deletar,
} = await import('../../src/controllers/usuarioController');
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

const usuarioBase = {
  id: 1,
  name: 'João',
  cpf: '12345678909',
  email: 'joao@x.com',
  telefone: '99999',
  perfil: 'VAGONETEIRO',
  historico: null,
  experiencia: null,
  ativo: true,
  data_associacao: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('usuarioController.listar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna lista de usuários', async () => {
    mockFindMany.mockResolvedValue([usuarioBase]);
    const res = mockRes();
    await listar(mockReq(), res);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { name: 'asc' } }),
    );
    expect(res.json).toHaveBeenCalledWith([usuarioBase]);
  });

  it('retorna 500 em erro', async () => {
    mockFindMany.mockRejectedValue(new Error('x'));
    const res = mockRes();
    await listar(mockReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('usuarioController.listarVagoneteiros', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna lista paginada convertendo foto para base64', async () => {
    const comFoto = { ...usuarioBase, foto: Buffer.from('foto-bytes') };
    mockFindMany.mockResolvedValue([comFoto]);
    mockCount.mockResolvedValue(1);

    const res = mockRes();
    await listarVagoneteiros(mockReq({ query: { page: '1', limit: '9' } }), res);

    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].foto).toBe(Buffer.from('foto-bytes').toString('base64'));
    expect(payload.total).toBe(1);
    expect(payload.totalPages).toBe(1);
    expect(payload.page).toBe(1);
  });

  it('usa filtro de perfil VAGONETEIRO quando passado', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    const res = mockRes();
    await listarVagoneteiros(mockReq({ query: { perfil: 'VAGONETEIRO' } }), res);
    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.perfil.in).toEqual(['VAGONETEIRO']);
  });

  it('usa filtro de perfil ADMIN e inclui USUARIO/VAGONETEIRO default', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    const res = mockRes();
    await listarVagoneteiros(mockReq({ query: { perfil: 'ADMIN' } }), res);
    expect(mockFindMany.mock.calls[0][0].where.perfil.in).toEqual(['ADMIN']);

    await listarVagoneteiros(mockReq({ query: {} }), res);
    expect(mockFindMany.mock.calls[1][0].where.perfil.in).toEqual(['USUARIO', 'VAGONETEIRO']);
  });

  it('limita pagina e limit (max 50, min 1)', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
    const res = mockRes();
    await listarVagoneteiros(mockReq({ query: { page: '0', limit: '500' } }), res);
    const args = mockFindMany.mock.calls[0][0];
    expect(args.skip).toBe(0);
    expect(args.take).toBe(50);
  });
});

describe('usuarioController.buscarPorId', () => {
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

  it('retorna usuário com foto convertida', async () => {
    const usuario = { ...usuarioBase, foto: Buffer.from('foto'), passeios: [] };
    mockFindUnique.mockResolvedValue(usuario);
    const res = mockRes();
    await buscarPorId(mockReq({ params: { id: '5' } }), res);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.foto).toBe(Buffer.from('foto').toString('base64'));
    expect(payload.passeios).toEqual([]);
  });
});

describe('usuarioController.atualizarPerfil', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizarPerfil(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se usuário não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizarPerfil(mockReq({ params: { id: '5' }, body: { perfil: 'ADMIN' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejeita perfil inválido', async () => {
    mockFindUnique.mockResolvedValue(usuarioBase);
    const res = mockRes();
    await atualizarPerfil(mockReq({ params: { id: '5' }, body: { perfil: 'SUPERUSER' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Perfil inválido') }),
    );
  });

  it('atualiza perfil válido', async () => {
    mockFindUnique.mockResolvedValue(usuarioBase);
    mockUpdate.mockResolvedValue({ ...usuarioBase, perfil: 'REDATOR' });
    const res = mockRes();
    await atualizarPerfil(mockReq({ params: { id: '5' }, body: { perfil: 'REDATOR' } }), res);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { perfil: 'REDATOR' } }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ perfil: 'REDATOR' }));
  });
});

describe('usuarioController.atualizar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await atualizar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { name: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('atualiza somente campos fornecidos e converte foto', async () => {
    mockFindUnique.mockResolvedValue(usuarioBase);
    mockUpdate.mockResolvedValue({ ...usuarioBase, name: 'Maria', foto: Buffer.from('nova') });
    const res = mockRes();
    await atualizar(
      mockReq({ params: { id: '5' }, body: { name: 'Maria', foto: 'data:image/jpeg;base64,xxxx' } }),
      res,
    );
    const args = mockUpdate.mock.calls[0][0];
    expect(args.data.name).toBe('Maria');
    expect(args.data.foto).toBeDefined();
    // response foto convertida para base64
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ foto: Buffer.from('nova').toString('base64') }),
    );
  });

  it('permite limpar foto com null', async () => {
    mockFindUnique.mockResolvedValue(usuarioBase);
    mockUpdate.mockResolvedValue({ ...usuarioBase, foto: null });
    const res = mockRes();
    await atualizar(mockReq({ params: { id: '5' }, body: { foto: null } }), res);
    expect(mockUpdate.mock.calls[0][0].data.foto).toBeNull();
  });
});

describe('usuarioController.alternarAtivo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await alternarAtivo(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await alternarAtivo(mockReq({ params: { id: '5' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('alterna ativo de true para false', async () => {
    mockFindUnique.mockResolvedValue({ ...usuarioBase, ativo: true });
    mockUpdate.mockResolvedValue({ ...usuarioBase, ativo: false });
    const res = mockRes();
    await alternarAtivo(mockReq({ params: { id: '5' } }), res);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ativo: false } }),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ativo: false }));
  });
});

describe('usuarioController.deletar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejeita ID inválido', async () => {
    const res = mockRes();
    await deletar(mockReq({ params: { id: 'x' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('impede desativar a própria conta', async () => {
    const res = mockRes();
    await deletar(mockReq({ params: { id: '1' }, user: { id: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('própria conta') }),
    );
  });

  it('retorna 404 se não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' }, user: { id: 1 } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('faz soft-delete marcando como inativo', async () => {
    mockFindUnique.mockResolvedValue(usuarioBase);
    mockUpdate.mockResolvedValue({ ...usuarioBase, ativo: false });
    const res = mockRes();
    await deletar(mockReq({ params: { id: '5' }, user: { id: 1 } }), res);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ativo: false } }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Usuário desativado com sucesso' }),
    );
  });
});
