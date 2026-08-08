import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mock Prisma antes de importar o controller
const mockUpdateMany = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    agendamento: {
      updateMany: mockUpdateMany,
    },
  },
}));

const { cancelarEmMassa } = await import('../../src/controllers/agendamentoController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(
  body: Record<string, any>,
  user: { cpf?: string; id?: number; perfil?: string } = {},
): Partial<Request & { user: any }> {
  return { body, user } as any;
}

describe('agendamentoController.cancelarEmMassa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando dataInicio ou dataFim ausentes', async () => {
    const res = mockRes();
    await cancelarEmMassa(mockReq({ dataInicio: '2026-08-09' }), res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('dataInicio e dataFim') }),
    );
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 quando dataFim ausente', async () => {
    const res = mockRes();
    await cancelarEmMassa(mockReq({ dataFim: '2026-08-10' }), res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 com formato de data inválido', async () => {
    const res = mockRes();
    await cancelarEmMassa(
      mockReq({ dataInicio: '09/08/2026', dataFim: '2026-08-10' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('AAAA-MM-DD') }),
    );
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('retorna 400 quando dataInicio > dataFim', async () => {
    const res = mockRes();
    await cancelarEmMassa(
      mockReq({ dataInicio: '2026-08-20', dataFim: '2026-08-10' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('menor ou igual') }),
    );
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('chama updateMany com filtro de período (local) e NOT CANCELADO/REALIZADO', async () => {
    mockUpdateMany.mockResolvedValue({ count: 21 });

    const res = mockRes();
    await cancelarEmMassa(
      mockReq({ dataInicio: '2026-08-09', dataFim: '2026-08-09' }, { cpf: '12738985246' }),
      res as Response,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ cancelados: 21, message: expect.stringContaining('21') }),
    );

    const args = mockUpdateMany.mock.calls[0][0];
    // filtro: passeio.data dentro do período (buildado como local)
    expect(args.where.passeio.data.gte).toBeInstanceOf(Date);
    expect(args.where.passeio.data.lte).toBeInstanceOf(Date);
    // garante que NÃO cancela CANCELADO/REALIZADO
    expect(args.where.NOT).toEqual({ status: { in: ['CANCELADO', 'REALIZADO'] } });
  });

  it('grava auditoria completa: status CANCELADO, canceladoPor=CPF do admin e motivo', async () => {
    mockUpdateMany.mockResolvedValue({ count: 5 });

    const res = mockRes();
    await cancelarEmMassa(
      mockReq(
        { dataInicio: '2026-08-01', dataFim: '2026-08-31', motivo: 'Condição climática' },
        { cpf: '12738985246' },
      ),
      res as Response,
    );

    const data = mockUpdateMany.mock.calls[0][0].data;
    expect(data.status).toBe('CANCELADO');
    expect(data.canceladoPor).toBe('12738985246');
    expect(data.motivoCancelamento).toBe('Condição climática');
    expect(data.canceladoEm).toBeInstanceOf(Date);
  });

  it('usa canceladoPor null quando não há usuário no request (req.user ausente)', async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const res = mockRes();
    await cancelarEmMassa(mockReq({ dataInicio: '2026-08-01', dataFim: '2026-08-31' }), res as Response);

    const data = mockUpdateMany.mock.calls[0][0].data;
    expect(data.canceladoPor).toBeNull();
    expect(data.motivoCancelamento).toBeNull();
  });

  it('trata erro do Prisma retornando 500', async () => {
    mockUpdateMany.mockRejectedValue(new Error('db down'));
    const res = mockRes();
    await cancelarEmMassa(
      mockReq({ dataInicio: '2026-08-01', dataFim: '2026-08-31' }, { cpf: '1' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('cancelar em massa') }),
    );
  });
});
