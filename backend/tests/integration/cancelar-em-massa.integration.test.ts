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

describe('INTEGRAÇÃO — Cancelamento em massa (POST /agendamentos/cancelar-em-massa)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // authMiddleware busca usuário no banco + valida tokenVersion
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN' });
  });

  it('retorna 401 sem token (rota privativa do admin)', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .send({ dataInicio: '2026-08-09', dataFim: '2026-08-09' });
    expect(res.status).toBe(401);
    expect(prisma.model.agendamento.updateMany).not.toHaveBeenCalled();
  });

  it('retorna 403 para VAGONETEIRO (somente ADMIN pode cancelar em massa)', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'VAGONETEIRO'))
      .send({ dataInicio: '2026-08-09', dataFim: '2026-08-09' });
    expect(res.status).toBe(403);
    expect(prisma.model.agendamento.updateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 quando faltam as datas', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'))
      .send({ dataInicio: '2026-08-09' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('dataInicio e dataFim');
    expect(prisma.model.agendamento.updateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 com formato de data inválido', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'))
      .send({ dataInicio: '09/08/2026', dataFim: '2026-08-09' });
    expect(res.status).toBe(400);
    expect(prisma.model.agendamento.updateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 quando dataInicio > dataFim', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN'))
      .send({ dataInicio: '2026-08-20', dataFim: '2026-08-09' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('menor ou igual');
  });

  it('cancela em massa com sucesso e informa a contagem', async () => {
    prisma.model.agendamento.updateMany.mockResolvedValue({ count: 21 });

    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN', { cpf: '12738985246' }))
      .send({ dataInicio: '2026-08-09', dataFim: '2026-08-09', motivo: 'Condição climática' });

    expect(res.status).toBe(200);
    expect(res.body.cancelados).toBe(21);
    expect(res.body.message).toContain('21');

    const args = prisma.model.agendamento.updateMany.mock.calls[0][0];
    // filtro exclui CANCELADO/REALIZADO
    expect(args.where.NOT).toEqual({ status: { in: ['CANCELADO', 'REALIZADO'] } });
    // auditoria
    expect(args.data.status).toBe('CANCELADO');
    expect(args.data.canceladoPor).toBe('12738985246');
    expect(args.data.motivoCancelamento).toBe('Condição climática');
    expect(args.data.canceladoEm).toBeInstanceOf(Date);
  });

  it('grava motivo como null quando não informado', async () => {
    prisma.model.agendamento.updateMany.mockResolvedValue({ count: 2 });

    const res = await request(app)
      .post('/agendamentos/cancelar-em-massa')
      .set(mockAuthHeader(prisma, mockVerifyToken, 'ADMIN', { cpf: '12738985246' }))
      .send({ dataInicio: '2026-08-09', dataFim: '2026-08-10' });

    expect(res.status).toBe(200);
    const args = prisma.model.agendamento.updateMany.mock.calls[0][0];
    expect(args.data.motivoCancelamento).toBeNull();
    expect(args.data.canceladoPor).toBe('12738985246');
  });
});
