import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflitoService, SlotFactory } from '../../src/services/agendamento.service';

// O ConflitoService faz `await import('../lib/prisma')` internamente.
// Mockamos o módulo real para não tocar o banco.
// Usamos vi.hoisted para garantir a criação ANTES do hoisting do vi.mock.
const libPrismaMock = vi.hoisted(() => ({
  slotAtribuicao: { findMany: vi.fn() },
  slotPasseio: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  slotInstancia: { findMany: vi.fn() },
}));

vi.mock('../../src/lib/prisma', () => ({
  default: libPrismaMock,
  prisma: libPrismaMock, // o ConflitoService faz `await import()` e usa a export nomeada `prisma`
}));

const mockedPrisma = libPrismaMock;

describe('services/agendamento.service - ConflitoService', () => {
  const service = new ConflitoService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não retorna conflito quando vagoneteiro não tem atribuições na data', async () => {
    mockedPrisma.slotAtribuicao.findMany.mockResolvedValue([]);

    const conflitos = await service.verificarConflitoVagoneteiro(
      1,
      new Date('2026-07-20'),
      '09:00',
      '10:00',
    );

    expect(conflitos).toHaveLength(0);
  });

  it('detecta conflito quando horários se sobrepõem', async () => {
    mockedPrisma.slotAtribuicao.findMany.mockResolvedValue([
      {
        id: 10,
        instancia: { id: 99, data: new Date('2026-07-20'), horaInicio: '09:30', horaFim: '10:30' },
        slotPasseio: {},
      },
    ]);

    const conflitos = await service.verificarConflitoVagoneteiro(
      1,
      new Date('2026-07-20'),
      '09:00',
      '10:00',
    );

    expect(conflitos).toHaveLength(1);
    expect(conflitos[0].tipo).toBe('HORARIO');
    expect(conflitos[0].instanciaId).toBe(99);
    expect(conflitos[0].mensagem).toContain('09:30');
  });

  it('não detecta conflito quando horários são contíguos (um termina quando outro começa)', async () => {
    mockedPrisma.slotAtribuicao.findMany.mockResolvedValue([
      {
        id: 10,
        instancia: { id: 99, data: new Date('2026-07-20'), horaInicio: '10:00', horaFim: '11:00' },
        slotPasseio: {},
      },
    ]);

    const conflitos = await service.verificarConflitoVagoneteiro(
      1,
      new Date('2026-07-20'),
      '09:00',
      '10:00',
    );

    expect(conflitos).toHaveLength(0);
  });

  it('não detecta conflito em datas diferentes', async () => {
    // atribuição em 19/07, verificando 20/07
    mockedPrisma.slotAtribuicao.findMany.mockResolvedValue([]);

    const conflitos = await service.verificarConflitoVagoneteiro(
      1,
      new Date('2026-07-20'),
      '09:00',
      '10:00',
    );

    expect(conflitos).toHaveLength(0);
  });
});

describe('services/agendamento.service - SlotFactory (Composite Pattern)', () => {
  function makeSlot(tipo: string) {
    return {
      id: 1,
      tipo,
      titulo: 'Passeio Teste',
      horaInicio: '09:00',
      horaFim: '10:00',
      capacidade: 5,
    } as any;
  }

  it('cria SlotFixo para tipo FIXO', () => {
    const c = SlotFactory.criar(makeSlot('FIXO'));
    expect(c.getTipo()).toBe('FIXO');
    expect(c.getTitulo()).toBe('Passeio Teste');
    expect(c.getHorario()).toEqual({ inicio: '09:00', fim: '10:00' });
  });

  it('cria SlotIndividual para tipo INDIVIDUAL', () => {
    const c = SlotFactory.criar(makeSlot('INDIVIDUAL'));
    expect(c.getTipo()).toBe('INDIVIDUAL');
  });

  it('cria SlotLote para tipo LOTE', () => {
    const c = SlotFactory.criar(makeSlot('LOTE'));
    expect(c.getTipo()).toBe('LOTE');
  });

  it('lança erro para tipo desconhecido', () => {
    expect(() => SlotFactory.criar(makeSlot('INEXISTENTE'))).toThrow(
      /Tipo de slot desconhecido/,
    );
  });
});
