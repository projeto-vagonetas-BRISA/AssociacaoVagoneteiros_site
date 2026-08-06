import { describe, it, expect, vi } from 'vitest';

// recorrencia.service.ts agora usa o singleton `../lib/prisma` (fix aplicado),
// que exporta `prisma` nomeado e `default`. Mockamos o módulo do singleton.
// vi.hoisted garante a criação antes do hoisting do vi.mock.
const mockInstanciaCreate = vi.hoisted(() => vi.fn());
const libPrismaMock = vi.hoisted(() => ({
  slotInstancia: { create: mockInstanciaCreate },
}));

vi.mock('../../src/lib/prisma', () => ({
  default: libPrismaMock,
  prisma: libPrismaMock,
}));

const {
  RecorrenciaService,
  horaParaMinutos,
  minutosParaHora,
} = await import('../../src/services/recorrencia.service');

describe('services/recorrencia - helpers de horário', () => {
  it('horaParaMinutos converte "HH:MM" em minutos', () => {
    expect(horaParaMinutos('09:00')).toBe(540);
    expect(horaParaMinutos('10:30')).toBe(630);
    expect(horaParaMinutos('23:59')).toBe(1439);
    expect(horaParaMinutos('00:00')).toBe(0);
  });

  it('minutosParaHora converte minutos em "HH:MM" com padding', () => {
    expect(minutosParaHora(540)).toBe('09:00');
    expect(minutosParaHora(630)).toBe('10:30');
    expect(minutosParaHora(1439)).toBe('23:59');
    expect(minutosParaHora(0)).toBe('00:00');
    expect(minutosParaHora(5)).toBe('00:05');
  });

  it('round-trip horaParaMinutos/minutosParaHora é consistente', () => {
    for (let m = 0; m < 24 * 60; m += 7) {
      expect(horaParaMinutos(minutosParaHora(m))).toBe(m);
    }
  });
});

describe('services/recorrencia - expandirSlot', () => {
  const service = new RecorrenciaService();

  it('retorna vazio (0 criadas) para slot que não é FIXO', async () => {
    const slot = { id: 1, tipo: 'LOTE', diaSemana: null } as any;
    const result = await service.expandirSlot(slot, {
      inicio: new Date('2026-07-01'),
      fim: new Date('2026-07-31'),
    });
    expect(result.criadas).toBe(0);
    expect(result.ignoradas).toBe(0);
    expect(result.instancias).toHaveLength(0);
  });
});
