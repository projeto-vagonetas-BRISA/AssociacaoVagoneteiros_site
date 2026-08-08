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

describe('INTEGRAÇÃO — Passeios (/passeios)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN' });
  });

  it('GET /passeios (público) lista passeios com paginação', async () => {
    prisma.model.passeio.findMany.mockResolvedValue([
      { id: 1, titulo: 'Passeio 1', preco: '50', capacidade: 5, data: new Date('2026-07-20'), ativo: true },
    ]);
    prisma.model.passeio.count.mockResolvedValue(1);

    const res = await request(app).get('/passeios');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
    expect(prisma.model.passeio.findMany).toHaveBeenCalled();
  });

  it('GET /passeios/:id inválido retorna 400', async () => {
    const res = await request(app).get('/passeios/nao-numerico');
    expect(res.status).toBe(400);
  });

  it('GET /passeios/:id retorna 404 quando não existe', async () => {
    prisma.model.passeio.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/passeios/999');
    expect(res.status).toBe(404);
  });

  it('POST /passeios sem token retorna 401', async () => {
    const res = await request(app).post('/passeios').send({});
    expect(res.status).toBe(401);
  });

  it('POST /passeios sem campos obrigatórios retorna 400', async () => {
    const res = await request(app)
      .post('/passeios')
      .set('Authorization', adminToken)
      .send({ preco: 80 }); // falta capacidade e data
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('obrigatórios');
  });

  it('POST /passeios com token admin cria passeio vinculado ao admin', async () => {
    prisma.model.passeio.create.mockResolvedValue({
      id: 1, preco: '80', capacidade: 10, data: new Date('2099-08-01T12:00:00.000Z'), horario: '09:00', usuarioId: 1,
    });

    const res = await request(app)
      .post('/passeios')
      .set('Authorization', adminToken)
      .send({ preco: 80, capacidade: 10, data: '2099-08-01', horario: '09:00' });

    expect(res.status).toBe(201);
    expect(prisma.model.passeio.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usuarioId: 1, preco: 80, capacidade: 10 }) }),
    );
  });
});
