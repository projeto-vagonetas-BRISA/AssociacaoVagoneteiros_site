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

const avaliacaoBase = {
  id: 5, nota: 5, comentario: 'Ótimo', clienteId: 1, passeioId: 2, createdAt: new Date(),
};

describe('INTEGRAÇÃO — Avaliações (/avaliacoes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
  });

  it('GET /avaliacoes (público) lista avaliações', async () => {
    prisma.model.avaliacao.findMany.mockResolvedValue([avaliacaoBase]);
    const res = await request(app).get('/avaliacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /avaliacoes/:id retorna 404 quando não existe', async () => {
    prisma.model.avaliacao.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/avaliacoes/999');
    expect(res.status).toBe(404);
  });

  it('POST /avaliacoes sem token retorna 401', async () => {
    const res = await request(app).post('/avaliacoes').send({});
    expect(res.status).toBe(401);
  });

  it('POST /avaliacoes com nota fora de 1-5 retorna 400', async () => {
    const res = await request(app)
      .post('/avaliacoes')
      .set('Authorization', adminToken)
      .send({ nota: 6, clienteId: 1, passeioId: 2 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('entre 1 e 5');
  });

  it('POST /avaliacoes rejeita quando cliente não existe', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/avaliacoes')
      .set('Authorization', adminToken)
      .send({ nota: 5, clienteId: 1, passeioId: 2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Cliente não encontrado');
  });

  it('POST /avaliacoes rejeita quando passeio não existe', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue({ id: 1 });
    prisma.model.passeio.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/avaliacoes')
      .set('Authorization', adminToken)
      .send({ nota: 5, clienteId: 1, passeioId: 2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Passeio não encontrado');
  });

  it('POST /avaliacoes rejeita quando cliente não tem agendamento confirmado', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue({ id: 1 });
    prisma.model.passeio.findUnique.mockResolvedValue({ id: 2 });
    prisma.model.agendamento.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post('/avaliacoes')
      .set('Authorization', adminToken)
      .send({ nota: 5, clienteId: 1, passeioId: 2 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('não possui um agendamento confirmado');
  });

  it('POST /avaliacoes rejeita avaliação duplicada', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue({ id: 1 });
    prisma.model.passeio.findUnique.mockResolvedValue({ id: 2 });
    prisma.model.agendamento.findFirst.mockResolvedValue({ id: 9 }); // confirmado
    prisma.model.avaliacao.findFirst.mockResolvedValue(avaliacaoBase); // já avaliou
    const res = await request(app)
      .post('/avaliacoes')
      .set('Authorization', adminToken)
      .send({ nota: 5, clienteId: 1, passeioId: 2 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('já avaliou');
  });

  it('POST /avaliacoes cria avaliação com sucesso', async () => {
    prisma.model.clientes.findUnique.mockResolvedValue({ id: 1 });
    prisma.model.passeio.findUnique.mockResolvedValue({ id: 2 });
    prisma.model.agendamento.findFirst.mockResolvedValue({ id: 9 });
    prisma.model.avaliacao.findFirst.mockResolvedValue(null);
    prisma.model.avaliacao.create.mockResolvedValue(avaliacaoBase);
    const res = await request(app)
      .post('/avaliacoes')
      .set('Authorization', adminToken)
      .send({ nota: 5, comentario: 'Ótimo', clienteId: 1, passeioId: 2 });
    expect(res.status).toBe(201);
    expect(prisma.model.avaliacao.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nota: 5, clienteId: 1, passeioId: 2 }) }),
    );
  });

  it('PUT /avaliacoes/:id atualiza nota', async () => {
    prisma.model.avaliacao.findUnique.mockResolvedValue(avaliacaoBase);
    prisma.model.avaliacao.update.mockResolvedValue({ ...avaliacaoBase, nota: 4 });
    const res = await request(app)
      .put('/avaliacoes/5')
      .set('Authorization', adminToken)
      .send({ nota: 4 });
    expect(res.status).toBe(200);
    expect(prisma.model.avaliacao.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nota: 4 }) }),
    );
  });

  it('DELETE /avaliacoes/:id deleta com sucesso', async () => {
    prisma.model.avaliacao.findUnique.mockResolvedValue(avaliacaoBase);
    prisma.model.avaliacao.delete.mockResolvedValue(avaliacaoBase);
    const res = await request(app)
      .delete('/avaliacoes/5')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deletada');
  });
});
