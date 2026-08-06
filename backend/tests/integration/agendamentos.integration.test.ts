import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: vi.fn(),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

const mockVagas = vi.fn();
vi.mock('../../src/services/vagas.service', () => ({
  calcularVagasDisponiveis: (...a: any[]) => mockVagas(...a),
}));

const mockEnviarEmail = vi.fn();
vi.mock('../../src/utils/email', () => ({
  enviarEmailConfirmacaoAgendamento: (...a: any[]) => mockEnviarEmail(...a),
}));

const { default: app } = await import('../../src/app');

const adminToken = 'Bearer token-admin';

describe('INTEGRAÇÃO — Agendamentos (/agendamentos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockReturnValue({ id: 1, cpf: '12345678909', email: null, perfil: 'ADMIN' });
    mockVagas.mockResolvedValue({ ocupadas: 0, disponiveis: 10, capacidade: 10 });
  });

  it('GET /agendamentos/vagas-disponiveis (público) retorna vagas', async () => {
    const hoje = new Date();
    prisma.model.passeio.findMany.mockResolvedValue([
      {
        id: 1, preco: '50', capacidade: 10, data: hoje, horario: '08:00', usuario: { id: 1, name: 'Ana' },
        agendamentos: [{ acompanhantes: 1 }, { acompanhantes: 0 }],
      },
    ]);

    const res = await request(app).get('/agendamentos/vagas-disponiveis');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // vagasOcupadas = (1+1)+(1+0) = 3
    expect(res.body.data[0].vagasOcupadas).toBe(3);
    expect(res.body.data[0].vagasDisponiveis).toBe(7);
  });

  it('POST /agendamentos/publico agendar com sucesso e disparar email', async () => {
    const passeio = { id: 1, preco: '50', data: new Date('2099-01-01T12:00:00.000Z'), horario: '08:00', ativo: true };
    prisma.model.passeio.findUnique.mockResolvedValue(passeio);
    prisma.model.clientes.findFirst.mockResolvedValue(null);
    prisma.model.clientes.create.mockResolvedValue({ id: 5, nome: 'Maria', telefone: '999', email: 'maria@x.com', cpf: 'T123' });
    prisma.model.agendamento.findFirst.mockResolvedValue(null);
    prisma.model.agendamento.create.mockResolvedValue({
      id: 10, clienteId: 5, passeioId: 1, promocao: false, notificacao: false, ciente: true, acompanhantes: 2,
      passeio: { id: 1, data: new Date('2099-01-01T12:00:00.000Z'), horario: '08:00', preco: '50' },
    });

    const res = await request(app)
      .post('/agendamentos/publico')
      .send({ nome: 'Maria', telefone: '999', email: 'maria@x.com', passeioId: 1, acompanhantes: 2 });

    expect(res.status).toBe(201);
    expect(prisma.model.agendamento.create).toHaveBeenCalled();
    // enviou email de confirmação
    expect(mockEnviarEmail).toHaveBeenCalledWith(
      'maria@x.com', 'Maria', 10, expect.any(String), '08:00', expect.any(String),
    );
  });

  it('POST /agendamentos/publico sem nome/telefone/passeioId retorna 400', async () => {
    const res = await request(app).post('/agendamentos/publico').send({ nome: 'Maria' });
    expect(res.status).toBe(400);
  });

  it('POST /agendamentos/publico com passeio inexistente retorna 404', async () => {
    prisma.model.passeio.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/agendamentos/publico')
      .send({ nome: 'Maria', telefone: '999', passeioId: 999 });
    expect(res.status).toBe(404);
  });

  it('GET /agendamentos/consulta/:id/:documento consulta agendamento', async () => {
    prisma.model.agendamento.findFirst.mockResolvedValue({
      id: 10, status: 'CONFIRMADO', acompanhantes: 1,
      cliente: { id: 5, nome: 'Maria', cpf: '12345678909' },
      passeio: { id: 1, data: new Date('2099-01-01T12:00:00.000Z'), horario: '08:00', preco: '50', usuario: { id: 1, name: 'Ana' } },
    });

    const res = await request(app).get('/agendamentos/consulta/10/12345678909');
    expect(res.status).toBe(200);
    expect(res.body.cliente).toBe('Maria');
    expect(res.body.vagas).toBe(2); // 1 + 1 acompanhante
    expect(res.body.total).toBe(100); // 50 * 2
  });

  it('PATCH /agendamentos/:id/status com status inválido retorna 400', async () => {
    const res = await request(app)
      .patch('/agendamentos/1/status')
      .set('Authorization', adminToken)
      .send({ status: 'INEXISTENTE' });
    expect(res.status).toBe(400);
  });

  it('PATCH /agendamentos/:id/status valida existência', async () => {
    prisma.model.agendamento.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .patch('/agendamentos/999/status')
      .set('Authorization', adminToken)
      .send({ status: 'CONFIRMADO' });
    expect(res.status).toBe(404);
  });

  it('GET /agendamentos sem token retorna 401', async () => {
    const res = await request(app).get('/agendamentos');
    expect(res.status).toBe(401);
  });
});
