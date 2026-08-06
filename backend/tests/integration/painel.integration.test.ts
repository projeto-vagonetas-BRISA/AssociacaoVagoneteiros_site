import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const { default: app } = await import('../../src/app');

describe('INTEGRAÇÃO — Painel (/painel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /painel/resumo calcula métricas do painel', async () => {
    prisma.model.agendamento.count.mockResolvedValue(5);
    prisma.model.clientes.count.mockResolvedValue(12);
    prisma.model.slotAtribuicao.count.mockResolvedValue(3);
    prisma.model.agendamento.aggregate.mockResolvedValue({ _sum: { acompanhantes: 4 } });
    prisma.model.agendamento.findMany.mockResolvedValue([
      { passeio: { preco: '50' }, acompanhantes: 1 }, // 50 * 2 = 100
      { passeio: { preco: '30' }, acompanhantes: 0 }, // 30 * 1 = 30
    ]);

    const res = await request(app).get('/painel/resumo');
    expect(res.status).toBe(200);
    expect(res.body.totalTuristas).toBe(9); // 5 + 4
    expect(res.body.passeiosRealizados).toBe(3);
    expect(res.body.totalClientes).toBe(12);
    expect(res.body.receitaEstimada).toBe(130);
  });

  it('GET /painel/avaliacao retorna cache zerado quando não há', async () => {
    prisma.model.avaliacaoCache.findFirst.mockResolvedValue(null);
    const res = await request(app).get('/painel/avaliacao');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ avaliacaoMedia: 0, totalAvaliacoes: 0, atualizadaEm: null });
  });

  it('GET /painel/avaliacao retorna cache existente', async () => {
    prisma.model.avaliacaoCache.findFirst.mockResolvedValue({
      id: 1, avaliacaoMedia: '4.6', totalAvaliacoes: 12, atualizadaEm: new Date('2026-08-01'),
    });
    const res = await request(app).get('/painel/avaliacao');
    expect(res.status).toBe(200);
    expect(res.body.avaliacaoMedia).toBe(4.6);
    expect(res.body.totalAvaliacoes).toBe(12);
  });

  it('POST /painel/avaliacao/atualizar sem campos retorna 400', async () => {
    const res = await request(app).post('/painel/avaliacao/atualizar').send({});
    expect(res.status).toBe(400);
  });

  it('POST /painel/avaliacao/atualizar cria cache e retorna valores', async () => {
    prisma.model.avaliacaoCache.create.mockResolvedValue({
      id: 2, avaliacaoMedia: '4.8', totalAvaliacoes: 20, atualizadaEm: new Date('2026-08-06'),
    });
    const res = await request(app)
      .post('/painel/avaliacao/atualizar')
      .send({ avaliacaoMedia: 4.8, totalAvaliacoes: 20 });
    expect(res.status).toBe(200);
    expect(res.body.avaliacaoMedia).toBe(4.8);
    expect(res.body.totalAvaliacoes).toBe(20);
  });
});
