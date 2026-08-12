import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── REGRESSÃO: escalada de privilégio via registro público ───
// Garante que POST /register (publico) NUNCA aceita um perfil arbitrário
// vindo do cliente. O perfil deve ser forçado como 'VAGONETEIRO' no servidor.

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockHash = vi.fn();
const mockGenerateToken = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    usuario: {
      findUnique: (...args: any[]) => mockFindUnique(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: { hash: (...args: any[]) => mockHash(...args) },
}));

vi.mock('../../src/utils/jwt', () => ({
  generateToken: (...args: any[]) => mockGenerateToken(...args),
}));

vi.mock('../../src/utils/image', () => ({
  parseBase64Image: vi.fn().mockImplementation(() => Buffer.from('img')),
}));

// cleanCPF/isValidEmail reais (puros, sem I/O) — não mockar

const { cadastro } = await import('../../src/controllers/authController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(overrides: any = {}) {
  return { body: {}, params: {}, query: {}, ...overrides } as any;
}

function baseCadastro() {
  mockFindUnique.mockResolvedValue(null); // CPF/email não existem
  mockHash.mockResolvedValue('hashed');
  mockGenerateToken.mockResolvedValue('token');
  mockCreate.mockImplementation(async ({ data }: any) => ({
    id: 1,
    ...data,
    tokenVersion: 0,
  }));
}

describe('regressão — POST /register não permite escalada de privilégio', () => {
  beforeEach(() => vi.clearAllMocks());

  it('força perfil VAGONETEIRO mesmo quando o cliente envia perfil: ADMIN', async () => {
    baseCadastro();
    const res = mockRes();

    await cadastro(
      mockReq({
        body: {
          name: 'Invasor',
          cpf: '123.456.789-09',
          senha: 'senha123',
          telefone: '99999',
          perfil: 'ADMIN', // tentativa de escalada
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    // o create DEVE ter forçado VAGONETEIRO
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.perfil).toBe('VAGONETEIRO');
    // e o perfil do cliente foi ignorado
    expect(data.perfil).not.toBe('ADMIN');
  });

  it('ignora perfil USUARIO enviado pelo cliente (forced VAGONETEIRO)', async () => {
    baseCadastro();
    const res = mockRes();

    await cadastro(
      mockReq({
        body: {
          name: 'Ana',
          cpf: '111.222.333-44',
          senha: 'senha123',
          telefone: '999',
          perfil: 'USUARIO',
        },
      }),
      res,
    );

    expect(mockCreate.mock.calls[0][0].data.perfil).toBe('VAGONETEIRO');
  });

  it('registra usuário comum corretamente (sem tentativa de escalada)', async () => {
    baseCadastro();
    const res = mockRes();

    await cadastro(
      mockReq({
        body: {
          name: 'João',
          cpf: '987.654.321-00',
          senha: 'senha123',
          telefone: '888',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.perfil).toBe('VAGONETEIRO');
    // corpo enviado para o token contém o perfil forçado
    const tokenArgs = mockGenerateToken.mock.calls[0][0];
    expect(tokenArgs).toMatchObject({ perfil: 'VAGONETEIRO' });
  });

  it('rejeita cadastro quando CPF já existe (independente do perfil enviado)', async () => {
    mockFindUnique.mockResolvedValue({ id: 99, cpf: '12345678909' });
    const res = mockRes();

    await cadastro(
      mockReq({
        body: {
          name: 'X',
          cpf: '123.456.789-09',
          senha: 'senha123',
          telefone: '999',
          perfil: 'ADMIN',
        },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('CPF já está cadastrado') }),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('mantém validações básicas (CPF inválido) antes de qualquer create', async () => {
    const res = mockRes();
    await cadastro(
      mockReq({
        body: {
          name: 'X',
          cpf: '123',
          senha: 'senha123',
          telefone: '999',
          perfil: 'ADMIN',
        },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('CPF inválido') }),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
