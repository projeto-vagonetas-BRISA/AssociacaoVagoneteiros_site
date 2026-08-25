import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateNotificationTimes,
  NOTIFICATION_INTERVALS,
} from '../../src/utils/notificationUtils';

describe('utils/notificationUtils', () => {
  const ORIGINAL_TZ = process.env.APP_TIMEZONE;

  afterEach(() => {
    if (ORIGINAL_TZ === undefined) delete process.env.APP_TIMEZONE;
    else process.env.APP_TIMEZONE = ORIGINAL_TZ;
  });

  beforeEach(() => {
    process.env.APP_TIMEZONE = 'America/Sao_Paulo';
  });

  it('gera um lembrete para cada intervalo configurado', () => {
    // data com horário UTC explícito (14:00 UTC)
    const data = '2026-07-20T14:00:00.000Z';
    const horario = '11:00'; // local SP
    const result = calculateNotificationTimes(data, horario);
    expect(result).toHaveLength(NOTIFICATION_INTERVALS.length);
  });

  it('gera tempos com diferença exatamente igual ao offsetMs', () => {
    const data = new Date('2026-07-20T14:00:00.000Z');
    const result = calculateNotificationTimes(data, '11:00');
    const original = data.getTime();

    for (const item of result) {
      const intervalo = NOTIFICATION_INTERVALS.find((i) => i.tipo === item.tipo)!;
      expect(original - item.enviarEm.getTime()).toBe(intervalo.offsetMs);
    }
  });

  it('calcula o instante UTC correto quando data é date-only (00:00) com timezone SP', () => {
    // "2026-07-20T00:00:00.000Z" → data-only; passeio às 11:00 local (SP, UTC-3) = 14:00Z
    const data = '2026-07-20T00:00:00.000Z';
    const horario = '11:00';
    const result = calculateNotificationTimes(data, horario);

    const oneHour = result.find((i) => i.tipo === 'ONE_HOUR')!;
    // passeio às 14:00Z - 1h = 13:00Z
    expect(oneHour.enviarEm.toISOString()).toBe('2026-07-20T13:00:00.000Z');
  });

  it('respeita timezone configurada em APP_TIMEZONE', () => {
    process.env.APP_TIMEZONE = 'America/New_York'; // UTC-4
    const data = '2026-07-20T00:00:00.000Z'; // date-only
    const horario = '09:00'; // local NY = 13:00Z
    const result = calculateNotificationTimes(data, horario);

    const oneHour = result.find((i) => i.tipo === 'ONE_HOUR')!;
    expect(oneHour.enviarEm.toISOString()).toBe('2026-07-20T12:00:00.000Z');
  });

  it('handles horários no limite de meia-noite', () => {
    const data = '2026-07-20T00:00:00.000Z';
    const result = calculateNotificationTimes(data, '00:30');
    expect(result.every((r) => !isNaN(r.enviarEm.getTime()))).toBe(true);
  });
});
