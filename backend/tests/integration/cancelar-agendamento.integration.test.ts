import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

// A rota /cancelar/:id é pública (sem autenticação). Nenhum mock de auth necessário.

const { default: app } = await import('../../src/app');

function agendamentoBase(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    status: 'CONFIRMADO',
    cliente: { cpf: '123.456.789-09' },
    passeio: { data: new Date('2099-01-01T12:00:00.000Z') }, // futuro
    ...overrides,
  };
}

describe('INTEGRAÇÃO — Cancelamento público de agendamento (POST /agendamentos/cancelar/:id)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancela com sucesso (rota pública, sem token) e preenche auditoria', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue(agendamentoBase());
    prisma.model.agendamento.update.mockResolvedValue({ id: 10, status: 'CANCELADO' });

    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '12345678909' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('cancelado com sucesso');

    // Auditoria no update
    const data = prisma.model.agendamento.update.mock.calls[0][0].data;
    expect(data.status).toBe('CANCELADO');
    expect(data.canceladoPor).toBe('12345678909');
    expect(data.canceladoEm).toBeInstanceOf(Date);
  });

  it('aceita CPF sem máscara quando banco guarda com máscara', async () => {
    // banco guarda '123.456.789-09'; turista envia sem máscara
    prisma.model.agendamento.findFirst.mockResolvedValue(agendamentoBase());
    prisma.model.agendamento.update.mockResolvedValue({ id: 10, status: 'CANCELADO' });

    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '12345678909' });

    expect(res.status).toBe(200);
    expect(prisma.model.agendamento.update).toHaveBeenCalled();
  });

  it('retorna 404 quando CPF não pertence ao agendamento', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue(agendamentoBase());

    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '00000000000' });

    expect(res.status).toBe(404);
    expect(prisma.model.agendamento.update).not.toHaveBeenCalled();
  });

  it('retorna 400 para agendamento já cancelado', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue(agendamentoBase({ status: 'CANCELADO' }));

    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '12345678909' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('já foi cancelado');
    expect(prisma.model.agendamento.update).not.toHaveBeenCalled();
  });

  it('retorna 400 para passeio já realizado', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue(agendamentoBase({ status: 'REALIZADO' }));

    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '12345678909' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('já realizado');
  });

  it('retorna 400 para passeio com data passada', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue(
      agendamentoBase({ passeio: { data: new Date('2020-01-01') } }),
    );

    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '12345678909' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('já ocorreu');
  });

  it('retorna 400 quando CPF é inválido (menos de 11 dígitos)', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '123' });

    expect(res.status).toBe(400);
    expect(prisma.model.agendamento.findFirst).not.toHaveBeenCalled();
  });

  it('retorna 400 quando ID informado não é número', async () => {
    const res = await request(app)
      .post('/agendamentos/cancelar/abc')
      .send({ documento: '12345678909' });

    expect(res.status).toBe(400);
    expect(prisma.model.agendamento.update).not.toHaveBeenCalled();
  });

  it('rota continua pública (acessível sem token de autenticação)', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue(prisma.model.agendamento.findFirst.mock.results[0]?.value ?? agendamentoBase());

    // Sem header Authorization: não deve retornar 401
    const res = await request(app)
      .post('/agendamentos/cancelar/10')
      .send({ documento: '12345678909' });

    expect(res.status).not.toBe(401);
    expect([200, 400, 404]).toContain(res.status);
  });
});
