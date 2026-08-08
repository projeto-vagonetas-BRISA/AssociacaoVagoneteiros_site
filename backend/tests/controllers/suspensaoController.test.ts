import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mocks do Prisma antes de importar o controller
const mockCriar = vi.fn();
const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    suspensao: {
      create: mockCriar,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
    },
    slotInstancia: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    agendamento: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { criarSuspensao, removerSuspensao, listarSuspensoes } =
  await import('../../src/controllers/suspensaoController');
const prisma = (await import('../../src/lib/prisma')).default;
const { mockRes } = await import('../helpers/mockRes');

function mockReq(
  body: Record<string, any> = {},
  params: Record<string, string> = {},
  user: { id?: number } = {},
): Partial<Request & { user: any }> {
  return { body, params, user } as any;
}

describe('suspensaoController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('criarSuspensao', () => {
    it('retorna 400 quando dataInicio ou dataFim ausentes', async () => {
      const res = mockRes();
      await criarSuspensao(mockReq({ dataInicio: '2026-08-15' }), res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('dataInicio e dataFim') }),
      );
      expect(mockCriar).not.toHaveBeenCalled();
    });

    it('retorna 400 com formato de data inválido', async () => {
      const res = mockRes();
      await criarSuspensao(
        mockReq({ dataInicio: '15/08/2026', dataFim: '2026-08-16' }),
        res as Response,
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('AAAA-MM-DD') }),
      );
    });

    it('retorna 400 quando dataInicio > dataFim', async () => {
      const res = mockRes();
      await criarSuspensao(
        mockReq({ dataInicio: '2026-08-20', dataFim: '2026-08-16' }),
        res as Response,
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('menor ou igual') }),
      );
    });

    it('cria suspensão e suspende slots + agendamentos guardando statusAnterior', async () => {
      mockCriar.mockResolvedValue({ id: 1, ativa: true });
      prisma.slotInstancia.findMany.mockResolvedValue([
        { id: 10, status: 'AGENDADO' },
        { id: 11, status: 'EM_ANDAMENTO' },
      ]);
      prisma.agendamento.findMany.mockResolvedValue([
        { id: 100, status: 'CONFIRMADO' },
        { id: 101, status: 'PENDENTE' },
      ]);

      const res = mockRes();
      await criarSuspensao(
        mockReq(
          { dataInicio: '2026-08-15', dataFim: '2026-08-16', motivo: 'Manutenção' },
          {},
          { id: 39 },
        ),
        res as Response,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          slotsSuspensos: 2,
          agendamentosSuspensos: 2,
        }),
      );

      // suspensao.create com criadoPorId
      expect(mockCriar).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ criadoPorId: 39, motivo: 'Manutenção' }) }),
      );

      // slot instância 10: SUSPENSO + statusAnterior AGENDADO + suspensaoId 1
      const slotUpdate = prisma.slotInstancia.update.mock.calls.map((c: any[]) => c[0]);
      const slot10 = slotUpdate.find((s: any) => s.where.id === 10);
      expect(slot10.data.status).toBe('SUSPENSO');
      expect(slot10.data.statusAnterior).toBe('AGENDADO');
      expect(slot10.data.suspensaoId).toBe(1);

      // agendamento 100: SUSPENSO + statusAnterior CONFIRMADO
      const agrUpdate = prisma.agendamento.update.mock.calls.map((c: any[]) => c[0]);
      const agr100 = agrUpdate.find((a: any) => a.where.id === 100);
      expect(agr100.data.status).toBe('SUSPENSO');
      expect(agr100.data.statusAnterior).toBe('CONFIRMADO');
      expect(agr100.data.suspensaoId).toBe(1);
    });
  });

  describe('removerSuspensao', () => {
    it('retorna 400 quando ID não é número', async () => {
      const res = mockRes();
      await removerSuspensao(mockReq({}, { id: 'abc' }), res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('retorna 404 quando suspensão não existe', async () => {
      mockFindUnique.mockResolvedValue(null);
      const res = mockRes();
      await removerSuspensao(mockReq({}, { id: '99' }), res as Response);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('retorna 400 quando suspensão já foi removida (inativa)', async () => {
      mockFindUnique.mockResolvedValue({ id: 1, ativa: false });
      const res = mockRes();
      await removerSuspensao(mockReq({}, { id: '1' }), res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('já foi removida') }),
      );
    });

    it('restaura slots e agendamentos ao statusAnterior', async () => {
      mockFindUnique.mockResolvedValue({ id: 1, ativa: true });
      prisma.slotInstancia.findMany.mockResolvedValue([
        { id: 10, statusAnterior: 'AGENDADO' },
      ]);
      prisma.agendamento.findMany.mockResolvedValue([
        { id: 100, statusAnterior: 'CONFIRMADO' },
        { id: 101, statusAnterior: 'PENDENTE' },
      ]);
      mockUpdate.mockResolvedValue({ id: 1, ativa: false });

      const res = mockRes();
      await removerSuspensao(mockReq({}, { id: '1' }, { id: 39 }), res as Response);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ slotsRestaurados: 1, agendamentosRestaurados: 2 }),
      );

      // slot restaurado
      const slotUpdate = prisma.slotInstancia.update.mock.calls.map((c: any[]) => c[0]);
      expect(slotUpdate[0].data.status).toBe('AGENDADO');
      expect(slotUpdate[0].data.suspensaoId).toBeNull();
      expect(slotUpdate[0].data.statusAnterior).toBeNull();

      // agendamento restaurado
      const agrUpdate = prisma.agendamento.update.mock.calls.map((c: any[]) => c[0]);
      const agr100 = agrUpdate.find((a: any) => a.where.id === 100);
      expect(agr100.data.status).toBe('CONFIRMADO');
      expect(agr100.data.suspensaoId).toBeNull();

      // suspensão marcada removida
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ativa: false, removidaPorId: 39 }),
        }),
      );
    });
  });

  describe('listarSuspensoes', () => {
    it('lista suspensões em ordem decrescente', async () => {
      mockFindMany.mockResolvedValue([{ id: 2 }, { id: 1 }]);
      const res = mockRes();
      await listarSuspensoes(mockReq(), res as Response);
      expect(res.json).toHaveBeenCalledWith({ suspensoes: [{ id: 2 }, { id: 1 }] });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { criadoEm: 'desc' } }),
      );
    });
  });
});
