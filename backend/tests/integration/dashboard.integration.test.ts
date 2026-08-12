import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const { default: app } = await import('../../src/app');

describe('INTEGRAÇÃO — Dashboard (/dashboard)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /dashboard/metricas retorna métricas agrregadas', async () => {
    // 2 passeios com capacidade 3 e 5 (8 vagas) no período
    prisma.model.passeio.count.mockResolvedValue(2);
    prisma.model.passeio.findMany.mockResolvedValue([
      { id: 1, capacidade: 3 },
      { id: 2, capacidade: 5 },
    ]);
    prisma.model.agendamento.findMany.mockResolvedValue([
      { acompanhantes: 2, status: 'CONFIRMADO', passeioId: 1, passeio: { preco: 10, status: 'REALIZADO' } },
      { acompanhantes: 0, status: 'CONFIRMADO', passeioId: 2, passeio: { preco: 20, status: 'REALIZADO' } },
      { acompanhantes: 1, status: 'CANCELADO', passeioId: 2, passeio: { preco: 20, status: 'REALIZADO' } },
    ]);
    prisma.model.agendamento.count
      .mockResolvedValueOnce(10) // total agendamentos
      .mockResolvedValueOnce(3); // cancelados
    prisma.model.slotAtribuicao.count.mockResolvedValue(7);

    const res = await request(app).get('/dashboard/metricas?inicio=2026-01-01&fim=2026-01-31');

    expect(res.status).toBe(200);
    const m = res.body.metricas;
    expect(m.vagasDisponibilizadas).toBe(8);
    expect(m.vagasPreenchidas).toBe(6);
    expect(m.taxaOcupacao).toBe(75);
    expect(m.totalAgendamentos).toBe(10);
    expect(m.cancelados).toBe(3);
    expect(m.realizados).toBe(7);
    expect(m.indiceConversao).toBe(70);
    expect(m.receita).toBe(50);
    expect(m.totalPasseios).toBe(2);
  });

  it('GET /dashboard/metricas sem query usa período atual', async () => {
    prisma.model.passeio.count.mockResolvedValue(0);
    prisma.model.passeio.findMany.mockResolvedValue([]);
    prisma.model.agendamento.findMany.mockResolvedValue([]);
    prisma.model.agendamento.count.mockResolvedValue(0);
    prisma.model.slotAtribuicao.count.mockResolvedValue(0);

    const res = await request(app).get('/dashboard/metricas');
    expect(res.status).toBe(200);
    const hoje = new Date();
    expect(new Date(res.body.periodo.inicio).getMonth()).toBe(hoje.getMonth());
  });

  it('GET /dashboard/picos agrupa por dia, dia-semana e horário', async () => {
    // Domingo 04/01/2026 08:30, com 1 acompanhante (2 pessoas)
    prisma.model.agendamento.findMany.mockResolvedValue([
      { passeio: { data: new Date(2026, 0, 4), horario: '08:30:00' }, acompanhantes: 1 },
      { passeio: { data: new Date(2026, 0, 4), horario: '08:30:00' }, acompanhantes: 0 },
    ]);

    const res = await request(app).get('/dashboard/picos?inicio=2026-01-01&fim=2026-01-31');
    expect(res.status).toBe(200);
    expect(res.body.picos.porDia[0].total).toBe(3);
    expect(res.body.picos.porHorario[0].horario).toBe('08:30');
    expect(res.body.picos.porDiaSemana[0].dia).toBe('Domingo');
  });

  it('GET /dashboard/faturamento agrupa por vagoneteiro', async () => {
    prisma.model.passeio.findMany.mockResolvedValue([
      {
        id: 1, preco: 10, horario: '08:00', data: new Date(2026, 0, 5),
        usuario: { id: 7, name: 'João' },
        agendamentos: [{ acompanhantes: 2 }, { acompanhantes: 0 }], // 4 pessoas → 40
      },
      {
        id: 2, preco: 20, horario: '09:00', data: new Date(2026, 0, 6),
        usuario: { id: 7, name: 'João' },
        agendamentos: [{ acompanhantes: 1 }], // 2 pessoas → 40
      },
    ]);

    const res = await request(app).get('/dashboard/faturamento?inicio=2026-01-01&fim=2026-01-31');
    expect(res.status).toBe(200);
    expect(res.body.totalGeral).toBe(80);
    expect(res.body.vagoneteiros).toHaveLength(1);
    expect(res.body.vagoneteiros[0].nome).toBe('João');
  });

  it('GET /dashboard/faturamento com ordenar=total', async () => {
    prisma.model.passeio.findMany.mockResolvedValue([
      {
        id: 1, preco: 10, horario: '08:00', data: new Date(2026, 0, 5),
        usuario: { id: 1, name: 'A' }, agendamentos: [{ acompanhantes: 9 }], // 10 → 100
      },
      {
        id: 2, preco: 10, horario: '08:00', data: new Date(2026, 0, 6),
        usuario: { id: 2, name: 'B' }, agendamentos: [{ acompanhantes: 0 }], // 1 → 10
      },
    ]);
    const res = await request(app)
      .get('/dashboard/faturamento?inicio=2026-01-01&fim=2026-01-31&ordenar=total');
    expect(res.status).toBe(200);
    expect(res.body.vagoneteiros[0].nome).toBe('A');
  });
});
