import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';
import { mockAuthSetup } from './helpers/auth';

// ─── Mocks globais (antes do import do app) ───
const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockHash = vi.fn();
const mockCompare = vi.fn();
vi.mock('bcrypt', () => ({
  default: { hash: (...a: any[]) => mockHash(...a), compare: (...a: any[]) => mockCompare(...a) },
}));

const mockGenerateToken = vi.fn();
const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: (...a: any[]) => mockGenerateToken(...a),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

vi.mock('../../src/utils/image', () => ({
  parseBase64Image: vi.fn().mockReturnValue(null),
}));

const { default: app } = await import('../../src/app');

describe('INTEGRAÇÃO — Auth (/auth)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue('hash_senha');
    mockGenerateToken.mockReturnValue('token_jwt');
    mockVerifyToken.mockReturnValue({ id: 1, cpf: '12345678909', email: null, perfil: 'VAGONETEIRO' });
  });
  it('registra usuário via HTTP e retorna 201 com token', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue(null);
    prisma.model.usuario.create.mockResolvedValue({
      id: 1, name: 'João', cpf: '12345678909', senha: 'hash_senha',
      email: null, telefone: '99999', perfil: 'VAGONETEIRO', foto: null,
    });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', cpf: '123.456.789-09', senha: '123456', telefone: '99999' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('token_jwt');
    expect(res.body.user).not.toHaveProperty('senha');
    // CPF limpo antes do create
    expect(prisma.model.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cpf: '12345678909' }) }),
    );
  });

  it('registro com CPF duplicado retorna 400', async () => {
    prisma.model.usuario.findUnique.mockResolvedValueOnce({ id: 9 });

    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'João', cpf: '12345678909', senha: '123456', telefone: '99999' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('CPF já está cadastrado');
  });

  it('login com sucesso via HTTP retorna 200 e token', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue({
      id: 1, cpf: '12345678909', email: 'joao@x.com',
      perfil: 'ADMIN', senha: 'hash', foto: null,
      ativo: true, tokenVersion: 0,
    });
    mockCompare.mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: '123.456.789-09', senha: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('token_jwt');
    expect(res.body.user.perfil).toBe('ADMIN');
  });

  it('login com senha errada retorna 401', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue({
      id: 1, cpf: '12345678909', email: null, perfil: 'VAGONETEIRO', senha: 'hash', foto: null,
    });
    mockCompare.mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ identifier: '12345678909', senha: 'errada' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('incorretos');
  });

  it('/auth/me sem token retorna 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('ausente');
  });

  it('/auth/me com token válido retorna o usuário', async () => {
    // authMiddleware busca usuário no banco e valida tokenVersion
    mockAuthSetup(prisma, mockVerifyToken, { id: 1, perfil: 'VAGONETEIRO' });

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token_valido');

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, perfil: 'VAGONETEIRO' });
  });

  it('/auth/me com token inválido retorna 401', async () => {
    mockVerifyToken.mockImplementation(() => { throw new Error('invalid'); });

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer token_invalido');

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('inválido');
  });
});
