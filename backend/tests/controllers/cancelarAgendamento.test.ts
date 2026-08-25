import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

// Mock Prisma antes de importar o controller
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    agendamento: {
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));

const { cancelarPublico } = await import('../../src/controllers/agendamentoController');
const { mockRes } = await import('../helpers/mockRes');

function mockReq(params: Record<string, string> = {}, body: Record<string, any> = {}): Partial<Request> {
  return { params, body } as any;
}

function agendamentoBase(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    status: 'CONFIRMADO',
    cliente: { cpf: '123.456.789-09' }, // mascarado no banco de propósito
    passeio: { data: new Date('2099-01-01T12:00:00.000Z') }, // futuro
    ...overrides,
  };
}

describe('agendamentoController.cancelarPublico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando ID inválido (não numérico)', async () => {
    const res = mockRes();
    await cancelarPublico(
      mockReq({ id: 'abc' }, { documento: '12345678909' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('obrigatórios') }),
    );
  });

  it('retorna 400 quando CPF ausente ou menor que 11 dígitos', async () => {
    const res = mockRes();
    await cancelarPublico(mockReq({ id: '10' }, { documento: '123' }), res as Response);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('retorna 404 quando CPF não bate com o cliente do agendamento', async () => {
    mockFindFirst.mockResolvedValue(agendamentoBase());
    const res = mockRes();
    // CPF diferente do cliente (123.456.789-09)
    await cancelarPublico(
      mockReq({ id: '10' }, { documento: '00000000000' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Nenhum agendamento') }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('retorna 404 quando agendamento não existe', async () => {
    mockFindFirst.mockResolvedValue(null);
    const res = mockRes();
    await cancelarPublico(
      mockReq({ id: '999' }, { documento: '12345678909' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('recusa cancelar agendamento já CANCELADO', async () => {
    mockFindFirst.mockResolvedValue(agendamentoBase({ status: 'CANCELADO' }));
    const res = mockRes();
    await cancelarPublico(
      mockReq({ id: '10' }, { documento: '12345678909' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('já foi cancelado') }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('recusa cancelar agendamento REALIZADO', async () => {
    mockFindFirst.mockResolvedValue(agendamentoBase({ status: 'REALIZADO' }));
    const res = mockRes();
    await cancelarPublico(
      mockReq({ id: '10' }, { documento: '12345678909' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('já realizado') }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('recusa cancelar passeio com data passada (já ocorreu)', async () => {
    mockFindFirst.mockResolvedValue(
      agendamentoBase({ passeio: { data: new Date('2020-01-01') } }),
    );
    const res = mockRes();
    await cancelarPublico(
      mockReq({ id: '10' }, { documento: '12345678909' }),
      res as Response,
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('já ocorreu') }),
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('cancela com sucesso: ignora máscara do CPF, define CANCELADO e auditoria', async () => {
    // Cliente com CPF mascarado; turista informa CPF sem máscara
    mockFindFirst.mockResolvedValue(agendamentoBase());
    mockUpdate.mockResolvedValue({ id: 10, status: 'CANCELADO' });

    const res = mockRes();
    await cancelarPublico(
      mockReq({ id: '10' }, { documento: '12345678909' }),
      res as Response,
    );

    // no sucesso o controller responde direto com res.json (status 200 default do Express)
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('cancelado com sucesso') }),
    );

    // Verifica o update: status CANCELADO + auditoria (canceladoPor = CPF sem máscara)
    const updateArgs = mockUpdate.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 10 });
    expect(updateArgs.data.status).toBe('CANCELADO');
    expect(updateArgs.data.canceladoPor).toBe('12345678909');
    expect(updateArgs.data.canceladoEm).toBeInstanceOf(Date);
  });

  it('aceita CPF mascarado informado pelo turista (normaliza em memória)', async () => {
    mockFindFirst.mockResolvedValue(agendamentoBase());
    mockUpdate.mockResolvedValue({ id: 10, status: 'CANCELADO' });

    const res = mockRes();
    // Turista digita com máscara: 123.456.789-09 (idêntico ao banco)
    await cancelarPublico(
      mockReq({ id: '10' }, { documento: '123.456.789-09' }),
      res as Response,
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('cancelado com sucesso') }),
    );
    expect(mockUpdate).toHaveBeenCalled();
  });
});
