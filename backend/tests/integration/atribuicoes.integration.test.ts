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

const mockVerificarConflito = vi.fn();
vi.mock('../../src/services/agendamento.service', () => ({
  conflitoService: {
    verificarConflitoVagoneteiro: (...a: any[]) => mockVerificarConflito(...a),
  },
}));

const { default: app } = await import('../../src/app');

const vagToken = 'Bearer token-vag';

function instanciaValida() {
  return {
    id: 10,
    data: new Date('2099-12-20'),
    horaInicio: '09:00',
    horaFim: '10:00',
    status: 'AGENDADO',
    slotPasseioId: 3,
    slotPasseio: { id: 3, titulo: 'Passeio', horaInicio: '09:00', horaFim: '10:00', capacidade: 5, valor: 50, _count: { atribuicoes: 0 } },
  };
}

describe('INTEGRAÇÃO — Atribuições (/atribuicoes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { id: 7, perfil: 'VAGONETEIRO' });
    mockVerificarConflito.mockResolvedValue([]);
  });

  it('POST /atribuicoes/auto-atribuir sem token retorna 401', async () => {
    const res = await request(app).post('/atribuicoes/auto-atribuir').send({ instanciaId: 10 });
    expect(res.status).toBe(401);
  });

  it('POST /atribuicoes/auto-atribuir requer instanciaId', async () => {
    const res = await request(app)
      .post('/atribuicoes/auto-atribuir')
      .set('Authorization', vagToken)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /atribuicoes/auto-atribuir com instância inexistente retorna 404', async () => {
    prisma.model.slotInstancia.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/atribuicoes/auto-atribuir')
      .set('Authorization', vagToken)
      .send({ instanciaId: 999 });
    expect(res.status).toBe(404);
  });

  it('POST /atribuicoes/auto-atribuir com sucesso cria atribuição e passeio', async () => {
    prisma.model.slotInstancia.findUnique.mockResolvedValue(instanciaValida());
    prisma.model.slotAtribuicao.count.mockResolvedValue(0);
    prisma.model.slotAtribuicao.findFirst.mockResolvedValue(null);
    prisma.model.slotAtribuicao.create.mockResolvedValue({
      id: 100, slotPasseioId: 3, instanciaId: 10, vagoneteiroId: 7, status: 'ATRIBUIDO',
    });
    prisma.model.slotInstancia.update.mockResolvedValue({});
    prisma.model.passeio.findFirst.mockResolvedValue(null);
    prisma.model.passeio.create.mockResolvedValue({ id: 1 });

    const res = await request(app)
      .post('/atribuicoes/auto-atribuir')
      .set('Authorization', vagToken)
      .send({ instanciaId: 10 });

    expect(res.status).toBe(201);
    expect(prisma.model.slotAtribuicao.create).toHaveBeenCalled();
    expect(prisma.model.passeio.create).toHaveBeenCalled();
  });

  it('POST /atribuicoes/auto-atribuir rejeita instância já pega', async () => {
    prisma.model.slotInstancia.findUnique.mockResolvedValue(instanciaValida());
    prisma.model.slotAtribuicao.count.mockResolvedValue(1);
    const res = await request(app)
      .post('/atribuicoes/auto-atribuir')
      .set('Authorization', vagToken)
      .send({ instanciaId: 10 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('pego por outro');
  });

  it('GET /atribuicoes/minhas lista atribuições paginadas', async () => {
    prisma.model.slotAtribuicao.findMany.mockResolvedValue([
      { id: 1, status: 'ATRIBUIDO', slotPasseio: { titulo: 'P' }, instancia: { id: 10, data: new Date('2099-01-01'), horaInicio: '09:00', horaFim: '10:00' } },
    ]);
    prisma.model.slotAtribuicao.count.mockResolvedValue(1);
    prisma.model.passeio.findFirst.mockResolvedValue({
      agendamentos: [{ acompanhantes: 0 }],
    });

    const res = await request(app)
      .get('/atribuicoes/minhas')
      .set('Authorization', vagToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('GET /atribuicoes/minhas sem token retorna 401', async () => {
    const res = await request(app).get('/atribuicoes/minhas');
    expect(res.status).toBe(401);
  });
});
