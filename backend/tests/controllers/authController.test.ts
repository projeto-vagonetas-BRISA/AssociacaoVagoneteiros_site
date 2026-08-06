import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (devem ser declarados antes do import dinâmico) ───
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockHash = vi.fn();
const mockCompare = vi.fn();
const mockGenerateToken = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    usuario: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: (...args: any[]) => mockHash(...args),
    compare: (...args: any[]) => mockCompare(...args),
  },
}));

vi.mock('../../src/utils/jwt', () => ({
  generateToken: (...args: any[]) => mockGenerateToken(...args),
}));

vi.mock('../../src/utils/image', () => ({
  parseBase64Image: vi.fn().mockReturnValue(null),
}));

const { cadastro, login } = await import('../../src/controllers/authController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(body: Record<string, any> = {}) {
  return { body } as any;
}

describe('authController.cadastro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue('hash_senha');
    mockFindUnique.mockResolvedValue(null);
    mockGenerateToken.mockReturnValue('token_jwt');
  });

  it('rejeita quando faltam campos obrigatórios', async () => {
    const res = mockRes();
    await cadastro(mockReq({ name: 'João', cpf: '123' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('obrigatórios') }),
    );
  });

  it('rejeita CPF inválido', async () => {
    const res = mockRes();
    await cadastro(
      mockReq({ name: 'João', cpf: '123', senha: '123456', telefone: '99999' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('CPF inválido') }),
    );
  });

  it('rejeita senha curta', async () => {
    const res = mockRes();
    await cadastro(
      mockReq({ name: 'João', cpf: '12345678901', senha: '123', telefone: '99999' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('pelo menos 6') }),
    );
  });

  it('rejeita email com formato inválido', async () => {
    const res = mockRes();
    await cadastro(
      mockReq({
        name: 'João',
        cpf: '12345678901',
        senha: '123456',
        telefone: '99999',
        email: 'email-invalido',
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('e-mail') }),
    );
  });

  it('rejeita CPF já cadastrado', async () => {
    mockFindUnique.mockResolvedValueOnce({ id: 1 }); // primeiro findUnique (cpf)
    const res = mockRes();
    await cadastro(
      mockReq({ name: 'João', cpf: '123.456.789-09', senha: '123456', telefone: '99999' }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('CPF já está cadastrado') }),
    );
  });

  it('rejeita email já cadastrado', async () => {
    // 1º findUnique (cpf) → null; 2º findUnique (email) → usuário existente
    mockFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2, email: 'joao@x.com' });
    const res = mockRes();
    await cadastro(
      mockReq({
        name: 'João',
        cpf: '12345678901',
        senha: '123456',
        telefone: '99999',
        email: 'joao@x.com',
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('E-mail já está cadastrado') }),
    );
  });

  it('cadastra com sucesso, limpa CPF, hasheia senha e gera token', async () => {
    const novoUsuario = {
      id: 1,
      name: 'João',
      cpf: '12345678909',
      senha: 'hash_senha',
      email: null,
      telefone: '99999',
      perfil: 'VAGONETEIRO',
      foto: null,
    };
    mockCreate.mockResolvedValue(novoUsuario);

    const res = mockRes();
    await cadastro(
      mockReq({
        name: 'João',
        cpf: '123.456.789-09',
        senha: '123456',
        telefone: '99999',
      }),
      res,
    );

    // CPF limpo antes de criar
    expect(mockCreate.mock.calls[0][0].data.cpf).toBe('12345678909');
    expect(mockCreate.mock.calls[0][0].data.senha).toBe('hash_senha');
    expect(mockHash).toHaveBeenCalledWith('123456', expect.any(Number));

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.token).toBe('token_jwt');
    expect(payload.user).not.toHaveProperty('senha');
    expect(payload.user.perfil).toBe('VAGONETEIRO');
  });
});

describe('authController.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita sem identifier/senha', async () => {
    const res = mockRes();
    await login(mockReq({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejeita usuário inexistente', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = mockRes();
    await login(mockReq({ identifier: '12345678901', senha: 'x' }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('incorretos') }),
    );
  });

  it('rejeita senha incorreta', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      cpf: '12345678909',
      email: null,
      perfil: 'VAGONETEIRO',
      senha: 'hash',
      foto: null,
    });
    mockCompare.mockResolvedValue(false);
    const res = mockRes();
    await login(mockReq({ identifier: '12345678901', senha: 'errada' }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('loga com sucesso por CPF e retorna token sem senha', async () => {
    mockFindUnique.mockResolvedValue({
      id: 1,
      cpf: '12345678909',
      email: 'joao@x.com',
      perfil: 'ADMIN',
      senha: 'hash',
      foto: null,
    });
    mockCompare.mockResolvedValue(true);
    mockGenerateToken.mockReturnValue('token_jwt');

    const res = mockRes();
    await login(mockReq({ identifier: '123.456.789-09', senha: '123456' }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.token).toBe('token_jwt');
    expect(payload.user).not.toHaveProperty('senha');

    // identifier limpo e buscado por CPF
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { cpf: '12345678909' } });
  });

  it('loga por email quando identifier não é CPF válido', async () => {
    // Para email, o código NÃO tenta CPF (identifier limpo não tem 11 dígitos);
    // o único findUnique é por email e deve devolver o usuário direto.
    mockFindUnique.mockResolvedValue({
      id: 1,
      cpf: '12345678909',
      email: 'joao@x.com',
      perfil: 'VAGONETEIRO',
      senha: 'hash',
      foto: null,
    });
    mockCompare.mockResolvedValue(true);
    mockGenerateToken.mockReturnValue('token_jwt');

    const res = mockRes();
    await login(mockReq({ identifier: 'joao@x.com', senha: '123456' }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { email: 'joao@x.com' } });
  });
});
