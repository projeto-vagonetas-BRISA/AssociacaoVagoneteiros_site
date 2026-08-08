import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';
import { mockAuthSetup, mockAuthHeader } from './helpers/auth';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: vi.fn(),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

vi.mock('../../src/utils/image', () => ({
  parseBase64Image: vi.fn().mockReturnValue(null),
}));

const { default: app } = await import('../../src/app');

function setPerfil(perfil: string) {
  // Configura o payload E o prisma.usuario.findUnique (authMiddleware) com tokenVersion
  mockAuthSetup(prisma, mockVerifyToken, { perfil });
}
function auth(perfil: string) {
  // Configura o mock e retorna o header
  return mockAuthHeader(prisma, mockVerifyToken, perfil);
}

describe('INTEGRAÇÃO — RBAC / proteção de rotas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPerfil('ADMIN');
  });

  describe('Clientes (/clientes)', () => {
    it('GET /clientes/busca/:documento (público) busca por documento', async () => {
      prisma.model.clientes.findFirst.mockResolvedValue({
        id: 1, nome: 'Carlos', cpf: '12345678909', telefone: '999', email: null,
      });
      const res = await request(app).get('/clientes/busca/12345678909');
      expect(res.status).toBe(200);
      expect(res.body.nome).toBe('Carlos');
    });

    it('POST /clientes sem token retorna 401', async () => {
      const res = await request(app).post('/clientes').send({});
      expect(res.status).toBe(401);
    });

    it('POST /clientes com VAGONETEIRO (sem role) retorna 403', async () => {
      const res = await request(app)
        .post('/clientes')
        .set(auth('VAGONETEIRO'))
        .send({ nome: 'A', cpf: '12345678909', telefone: '999' });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Acesso negado');
    });

    it('POST /clientes com REDATOR cria cliente', async () => {
      prisma.model.clientes.findUnique.mockResolvedValue(null);
      prisma.model.clientes.create.mockResolvedValue({
        id: 1, nome: 'Ana', cpf: '12345678909', telefone: '999', email: null,
      });
      const res = await request(app)
        .post('/clientes')
        .set(auth('REDATOR'))
        .send({ nome: 'Ana', cpf: '123.456.789-09', telefone: '999' });
      expect(res.status).toBe(201);
    });

    it('POST /clientes com ADMIN cria cliente com CPF limpo', async () => {
      prisma.model.clientes.findUnique.mockResolvedValue(null);
      prisma.model.clientes.create.mockResolvedValue({
        id: 1, nome: 'Ana', cpf: '12345678909', telefone: '999', email: null,
      });
      const res = await request(app)
        .post('/clientes')
        .set(auth('ADMIN'))
        .send({ nome: 'Ana', cpf: '123.456.789-09', telefone: '999' });
      expect(res.status).toBe(201);
      expect(prisma.model.clientes.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cpf: '12345678909' }) }),
      );
    });
  });

  describe('Usuários (/usuarios)', () => {
    it('GET /usuarios sem token retorna 401', async () => {
      const res = await request(app).get('/usuarios');
      expect(res.status).toBe(401);
    });

    it('GET /usuarios com REDATOR retorna 403 (só ADMIN)', async () => {
      const res = await request(app).get('/usuarios').set(auth('REDATOR'));
      expect(res.status).toBe(403);
    });

    it('GET /usuarios/vagoneteiros com ADMIN lista vagoneteiros', async () => {
      prisma.model.usuario.findMany.mockResolvedValue([{ id: 1, name: 'João', perfil: 'VAGONETEIRO', ativo: true }]);
      prisma.model.usuario.count.mockResolvedValue(1);
      const res = await request(app).get('/usuarios/vagoneteiros').set(auth('ADMIN'));
      expect(res.status).toBe(200);
    });

    it('PATCH /usuarios/vagoneteiros/:id/ativo alterna ativo/inativo', async () => {
      prisma.model.usuario.findUnique.mockResolvedValue({ id: 1, name: 'João', ativo: true });
      prisma.model.usuario.update.mockResolvedValue({ id: 1, ativo: false });
      const res = await request(app)
        .patch('/usuarios/vagoneteiros/1/ativo')
        .set(auth('ADMIN'))
        .send({ ativo: false });
      expect(res.status).toBe(200);
    });
  });

  describe('Avaliações (/avaliacoes)', () => {
    it('GET /avaliacoes (público) lista avaliações', async () => {
      prisma.model.avaliacao.findMany.mockResolvedValue([{ id: 1, nota: 5, comentario: 'Ótimo' }]);
      const res = await request(app).get('/avaliacoes');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('POST /avaliacoes com VAGONETEIRO retorna 403', async () => {
      const res = await request(app).post('/avaliacoes').set(auth('VAGONETEIRO')).send({});
      expect(res.status).toBe(403);
    });

    it('POST /avaliacoes com ADMIN cria avaliação (fluxo completo)', async () => {
      prisma.model.clientes.findUnique.mockResolvedValue({ id: 1, nome: 'Ana' });
      prisma.model.passeio.findUnique.mockResolvedValue({ id: 1, data: new Date('2099-01-01') });
      prisma.model.agendamento.findFirst.mockResolvedValue({ id: 5, status: 'CONFIRMADO' });
      prisma.model.avaliacao.findFirst.mockResolvedValue(null);
      prisma.model.avaliacao.create.mockResolvedValue({
        id: 1, nota: 5, comentario: 'Ótimo', clienteId: 1, passeioId: 1,
      });
      const res = await request(app)
        .post('/avaliacoes')
        .set(auth('ADMIN'))
        .send({ nota: 5, comentario: 'Ótimo', clienteId: 1, passeioId: 1 });
      expect(res.status).toBe(201);
      expect(prisma.model.avaliacao.create).toHaveBeenCalled();
    });

    it('POST /avaliacoes com nota fora de 1-5 retorna 400', async () => {
      const res = await request(app)
        .post('/avaliacoes')
        .set(auth('ADMIN'))
        .send({ nota: 9, comentario: 'x', clienteId: 1, passeioId: 1 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('entre 1 e 5');
    });

    it('POST /avaliacoes sem agendamento confirmado retorna 400', async () => {
      prisma.model.clientes.findUnique.mockResolvedValue({ id: 1, nome: 'Ana' });
      prisma.model.passeio.findUnique.mockResolvedValue({ id: 1, data: new Date('2099-01-01') });
      prisma.model.agendamento.findFirst.mockResolvedValue(null);
      const res = await request(app)
        .post('/avaliacoes')
        .set(auth('ADMIN'))
        .send({ nota: 5, comentario: 'x', clienteId: 1, passeioId: 1 });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('agendamento confirmado');
    });
  });
});
