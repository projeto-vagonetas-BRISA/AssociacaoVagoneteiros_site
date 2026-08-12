import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';
import { mockAuthSetup } from './helpers/auth';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: vi.fn(),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

const { default: app } = await import('../../src/app');

const adminToken = 'Bearer token-admin';
const redatorToken = 'Bearer token-redator';
const vagToken = 'Bearer token-vag';

const clienteBase = {
  id: 1, nome: 'Maria', cpf: '12345678909', telefone: '99999',
  email: null, createdAt: new Date(),
};

describe('INTEGRAÇÃO — Clientes (/clientes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
  });

  it('GET /clientes (público) lista clientes', async () => {
    prisma.model.clientes.findMany.mockResolvedValue([clienteBase]);
    const res = await request(app).get('/clientes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(prisma.model.clientes.findMany).toHaveBeenCalled();
  });

  it('GET /clientes/busca/:documento limpa máscara e busca por CPF', async () => {
    prisma.model.clientes.findFirst.mockResolvedValue(clienteBase);
    const res = await request(app).get('/clientes/busca/123.456.789-09');
    expect(res.status).toBe(200);
    expect(res.body.cpf).toBe('12345678909');
    expect(prisma.model.clientes.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ cpf: '12345678909' }) }),
    );
  });

  it('GET /clientes/busca/:documento curto retorna 400', async () => {
    const res = await request(app).get('/clientes/busca/12');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('inválido');
  });

  it('GET /clientes/:id retorna 404 quando não existe', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/clientes/999');
    expect(res.status).toBe(404);
  });

  it('POST /clientes sem token retorna 401', async () => {
    const res = await request(app).post('/clientes').send({ nome: 'A', cpf: '123', telefone: '9' });
    expect(res.status).toBe(401);
  });

  it('POST /clientes com VAGONETEIRO (sem role) retorna 403', async () => {
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'VAGONETEIRO', id: 5 });
    const res = await request(app)
      .post('/clientes')
      .set('Authorization', vagToken)
      .send({ nome: 'A', cpf: '12345678909', telefone: '999' });
    expect(res.status).toBe(403);
  });

  it('POST /clientes (admin) cria cliente e limpa CPF', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue(null); // CPF não duplicado
    prisma.model.clientes.create.mockResolvedValue(clienteBase);
    const res = await request(app)
      .post('/clientes')
      .set('Authorization', adminToken)
      .send({ nome: 'Maria', cpf: '123.456.789-09', telefone: '99999' });
    expect(res.status).toBe(201);
    expect(prisma.model.clientes.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cpf: '12345678909' }) }),
    );
  });

  it('POST /clientes com CPF duplicado retorna 400', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue(clienteBase);
    const res = await request(app)
      .post('/clientes')
      .set('Authorization', adminToken)
      .send({ nome: 'Maria', cpf: '12345678909', telefone: '99999' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('CPF já está cadastrado');
  });

  it('PUT /clientes/:id (redator) atualiza campos', async () => {
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'REDATOR', id: 2 });
    prisma.model.clientes.findUnique.mockResolvedValue(clienteBase);
    prisma.model.clientes.findFirst.mockResolvedValue(null); // email livre
    prisma.model.clientes.update.mockResolvedValue({ ...clienteBase, nome: 'Maria Silva' });
    const res = await request(app)
      .put('/clientes/1')
      .set('Authorization', redatorToken)
      .send({ nome: 'Maria Silva', telefone: '88888' });
    expect(res.status).toBe(200);
    expect(prisma.model.clientes.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nome: 'Maria Silva' }) }),
    );
  });

  it('DELETE /clientes/:id (admin) deleta com sucesso', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue(clienteBase);
    prisma.model.clientes.delete.mockResolvedValue(clienteBase);
    const res = await request(app)
      .delete('/clientes/1')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deletado');
  });

  it('DELETE /clientes/:id com registros vinculados (P2003) retorna 400', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue(clienteBase);
    prisma.model.clientes.delete.mockRejectedValue({ code: 'P2003' });
    const res = await request(app)
      .delete('/clientes/1')
      .set('Authorization', adminToken);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('agendamentos ou avaliações');
  });
});
