import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';
import { mockAuthSetup } from './helpers/auth';

// slotController usa `new PrismaClient()` de '@prisma/client' (não o singleton lib/prisma)
const mockSlotFindUnique = vi.fn();
const mockSlotFindMany = vi.fn();
const mockSlotCount = vi.fn();
const mockSlotCreate = vi.fn();
const mockSlotUpdate = vi.fn();
const mockInstanciaCreate = vi.fn();
const mockInstanciaFindMany = vi.fn();
const mockInstanciaUpdateMany = vi.fn();
const mockAtribuicaoUpdateMany = vi.fn();
const mockPasseioFindMany = vi.fn();
const mockPasseioUpdateMany = vi.fn();
const mockAgendamentoUpdateMany = vi.fn();
const mockUsuarioFindUnique = vi.fn();
const mockExpandirSlot = vi.fn();
const mockGerarLote = vi.fn();
const mockObterInstancias = vi.fn();

class MockPrismaClient {
  slotPasseio = {
    findUnique: mockSlotFindUnique,
    findMany: mockSlotFindMany,
    count: mockSlotCount,
    create: mockSlotCreate,
    update: mockSlotUpdate,
  };
  slotInstancia = {
    create: mockInstanciaCreate,
    findMany: mockInstanciaFindMany,
    updateMany: mockInstanciaUpdateMany,
  };
  slotAtribuicao = { updateMany: mockAtribuicaoUpdateMany };
  passeio = {
    findMany: mockPasseioFindMany,
    updateMany: mockPasseioUpdateMany,
  };
  agendamento = { updateMany: mockAgendamentoUpdateMany };
  usuario = { findUnique: mockUsuarioFindUnique };
  $disconnect = vi.fn();
}

vi.mock('@prisma/client', () => ({
  PrismaClient: MockPrismaClient,
  TipoSlot: { FIXO: 'FIXO', LOTE: 'LOTE', INDIVIDUAL: 'INDIVIDUAL' },
  DiaSemana: {
    SEGUNDA: 'SEGUNDA', TERCA: 'TERCA', QUARTA: 'QUARTA', QUINTA: 'QUINTA',
    SEXTA: 'SEXTA', SABADO: 'SABADO', DOMINGO: 'DOMINGO',
  },
  StatusSlot: { DISPONIVEL: 'DISPONIVEL', ATRIBUIDO: 'ATRIBUIDO', CANCELADO: 'CANCELADO', REALIZADO: 'REALIZADO' },
}));

vi.mock('../../src/services/recorrencia.service', () => ({
  recorrenciaService: {
    expandirSlot: (...a: any[]) => mockExpandirSlot(...a),
    gerarLote: (...a: any[]) => mockGerarLote(...a),
    obterInstancias: (...a: any[]) => mockObterInstancias(...a),
  },
  horaParaMinutos: (h: string) => { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm; },
  minutosParaHora: (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
}));

vi.mock('../../src/services/agendamento.service', () => ({
  SlotFactory: {
    criar: vi.fn().mockReturnValue({
      getInstancias: vi.fn().mockResolvedValue([{ id: 1, data: new Date(), horaInicio: '08:00' }]),
      getDetalhes: vi.fn().mockResolvedValue({ slot: {}, instancias: [], vagasOcupadas: 1, vagasDisponiveis: 3 }),
    }),
  },
}));

const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: vi.fn(),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

// prisma singleton: usado pelo authMiddleware (busca usuário) e outros módulos do grafo
const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const { default: app } = await import('../../src/app');

const adminToken = 'Bearer token-admin';

const slotBase = {
  id: 10, tipo: 'FIXO', titulo: 'Passeio de lancha', descricao: null,
  horaInicio: '08:00', horaFim: '09:30', duracaoMinutos: 90,
  diaSemana: 'SEGUNDA', dataInicio: new Date(), dataFim: null, intervaloDias: null,
  loteId: null, capacidade: 4, valor: 25, usuarioId: null, status: 'DISPONIVEL',
  instancias: [],
};

function amanhaISO() { return new Date(Date.now() + 86400000).toISOString().split('T')[0]; }

describe('INTEGRAÇÃO — Slots (/slots)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
  });

  it('GET /slots (público) lista slots paginados', async () => {
    mockSlotFindMany.mockResolvedValue([slotBase]);
    mockSlotCount.mockResolvedValue(1);
    const res = await request(app).get('/slots');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('GET /slots/disponiveis filtra por DISPONIVEL', async () => {
    mockSlotFindMany.mockResolvedValue([slotBase]);
    const res = await request(app).get('/slots/disponiveis');
    expect(res.status).toBe(200);
    expect(mockSlotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'DISPONIVEL' }) }),
    );
  });

  it('GET /slots/:id retorna 404 quando não existe', async () => {
    mockSlotFindUnique.mockResolvedValue(null);
    const res = await request(app).get('/slots/999');
    expect(res.status).toBe(404);
  });

  it('POST /slots sem token retorna 401', async () => {
    const res = await request(app).post('/slots').send({});
    expect(res.status).toBe(401);
  });

  it('POST /slots cria slot FIXO e expande recorrência', async () => {
    mockUsuarioFindUnique.mockResolvedValue(null);
    mockSlotCreate.mockResolvedValue(slotBase);
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockExpandirSlot.mockResolvedValue({ criadas: 4, ignoradas: 0, instancias: [] });

    const res = await request(app)
      .post('/slots')
      .set('Authorization', adminToken)
      .send({
        tipo: 'FIXO', titulo: 'Passeio de lancha',
        horaInicio: '08:00', horaFim: '09:30',
        capacidade: '4', valor: '25', diaSemana: 'SEGUNDA',
      });

    expect(res.status).toBe(201);
    expect(mockSlotCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tipo: 'FIXO', diaSemana: 'SEGUNDA' }) }),
    );
    expect(mockExpandirSlot).toHaveBeenCalled();
  });

  it('POST /slots rejeita tipo inválido', async () => {
    const res = await request(app)
      .post('/slots')
      .set('Authorization', adminToken)
      .send({ tipo: 'INVALIDO', titulo: 'x', horaInicio: '08:00', horaFim: '09:00', capacidade: 4, valor: 25 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('tipo inválido');
  });

  it('POST /slots/lotes/gerar gera lote', async () => {
    mockGerarLote.mockResolvedValue([slotBase, { ...slotBase, id: 11 }]);
    const res = await request(app)
      .post('/slots/lotes/gerar')
      .set('Authorization', adminToken)
      .send({ titulo: 'Lote', horaInicio: '08:00', horaFim: '09:00', capacidade: '4', valor: '25', dataInicio: amanhaISO(), dataFim: amanhaISO() });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(mockGerarLote).toHaveBeenCalled();
  });

  it('POST /slots/:id/expandir expande slot FIXO', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockExpandirSlot.mockResolvedValue({ criadas: 3, ignoradas: 0, instancias: [] });
    const res = await request(app)
      .post('/slots/10/expandir')
      .set('Authorization', adminToken)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.criadas).toBe(3);
  });

  it('PUT /slots/:id atualiza slot', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockSlotUpdate.mockResolvedValue({ ...slotBase, capacidade: 6 });
    const res = await request(app)
      .put('/slots/10')
      .set('Authorization', adminToken)
      .send({ capacidade: '6' });
    expect(res.status).toBe(200);
    expect(mockSlotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ capacidade: 6 }) }),
    );
  });

  it('DELETE /slots/:id cancela slot em cascata', async () => {
    mockSlotFindUnique.mockResolvedValue(slotBase);
    mockSlotUpdate.mockResolvedValue({ ...slotBase, status: 'CANCELADO' });
    mockInstanciaFindMany.mockResolvedValue([{ id: 1 }]);
    mockPasseioFindMany.mockResolvedValue([{ id: 5 }]);
    const res = await request(app)
      .delete('/slots/10')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Slot cancelado');
    expect(mockSlotUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELADO' }) }),
    );
  });
});
