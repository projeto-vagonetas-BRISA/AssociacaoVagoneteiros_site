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

const { default: app } = await import('../../src/app');

function suspensaoAtiva(id = 1, overrides: Record<string, any> = {}) {
  return {
    id,
    dataInicio: new Date('2026-08-15T03:00:00.000Z'),
    dataFim: new Date('2026-08-17T02:59:59.999Z'),
    motivo: 'Manutenção no trajeto',
    criadoPorId: 39,
    criadoEm: new Date(),
    ativa: true,
    removidaEm: null,
    removidaPorId: null,
    ...overrides,
  };
}

describe('INTEGRAÇÃO — Suspensão de atividades (/suspensoes)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN' });
  });

  it('retorna 401 sem token (privativo do admin)', async () => {
    const res = await request(app).get('/suspensoes');
    expect(res.status).toBe(401);
  });

  it('retorna 403 para VAGONETEIRO (somente ADMIN)', async () => {
    const res = await request(app)
      .post('/suspensoes')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'VAGONETEIRO'))
      .send({ dataInicio: '2026-08-15', dataFim: '2026-08-16' });
    expect(res.status).toBe(403);
  });

  it('lista suspensões', async () => {
    prisma.model.suspensao.findMany.mockResolvedValue([suspensaoAtiva()]);
    const res = await request(app)
      .get('/suspensoes')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'));
    expect(res.status).toBe(200);
    expect(res.body.suspensoes).toHaveLength(1);
    expect(res.body.suspensoes[0].ativa).toBe(true);
  });

  it('cria suspensão e suspende slots e agendamentos', async () => {
    prisma.model.suspensao.create.mockResolvedValue(suspensaoAtiva());
    prisma.model.slotInstancia.findMany.mockResolvedValue([
      { id: 10, status: 'AGENDADO' },
    ]);
    prisma.model.agendamento.findMany.mockResolvedValue([
      { id: 100, status: 'CONFIRMADO' },
    ]);

    const res = await request(app)
      .post('/suspensoes')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN', { id: 39 }))
      .send({ dataInicio: '2026-08-15', dataFim: '2026-08-16', motivo: 'Manutenção' });

    expect(res.status).toBe(201);
    expect(res.body.slotsSuspensos).toBe(1);
    expect(res.body.agendamentosSuspensos).toBe(1);
    expect(prisma.model.slotInstancia.update).toHaveBeenCalled();
    expect(prisma.model.agendamento.update).toHaveBeenCalled();
  });

  it('retorna 400 para dataInicio > dataFim', async () => {
    const res = await request(app)
      .post('/suspensoes')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'))
      .send({ dataInicio: '2026-08-20', dataFim: '2026-08-16' });
    expect(res.status).toBe(400);
    expect(prisma.model.suspensao.create).not.toHaveBeenCalled();
  });

  it('remove suspensão e restaura itens ao status anterior', async () => {
    prisma.model.suspensao.findUnique.mockResolvedValue(suspensaoAtiva());
    prisma.model.slotInstancia.findMany.mockResolvedValue([
      { id: 10, statusAnterior: 'AGENDADO' },
    ]);
    prisma.model.agendamento.findMany.mockResolvedValue([
      { id: 100, statusAnterior: 'CONFIRMADO' },
    ]);
    prisma.model.suspensao.update.mockResolvedValue(suspensaoAtiva(1, { ativa: false }));

    const res = await request(app)
      .delete('/suspensoes/1')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN', { id: 39 }));

    expect(res.status).toBe(200);
    expect(res.body.slotsRestaurados).toBe(1);
    expect(res.body.agendamentosRestaurados).toBe(1);
    // suspensão marcada removida
    expect(prisma.model.suspensao.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ativa: false }) }),
    );
  });

  it('retorna 404 ao remover suspensão inexistente', async () => {
    prisma.model.suspensao.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .delete('/suspensoes/99')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'));
    expect(res.status).toBe(404);
  });

  it('retorna 400 ao remover suspensão já removida', async () => {
    prisma.model.suspensao.findUnique.mockResolvedValue(suspensaoAtiva(1, { ativa: false }));
    const res = await request(app)
      .delete('/suspensoes/1')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'));
    expect(res.status).toBe(400);
  });
});
