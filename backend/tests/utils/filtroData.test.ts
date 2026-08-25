import { describe, it, expect } from 'vitest';
import { parseFiltroData } from '../../src/utils/filtroData';

describe('utils/filtroData', () => {
  it('retorna undefined quando inicio ou fim estão faltando', () => {
    expect(parseFiltroData(undefined, '2026-07-01')).toBeUndefined();
    expect(parseFiltroData('2026-07-01', undefined)).toBeUndefined();
    expect(parseFiltroData(undefined, undefined)).toBeUndefined();
  });

  it('retorna undefined para strings vazias', () => {
    expect(parseFiltroData('', '')).toBeUndefined();
  });

  it('cobre o dia final por completo (fim vira 00:00 do dia seguinte)', () => {
    const result = parseFiltroData('2026-07-01', '2026-07-27');
    expect(result).toBeDefined();
    expect(result!.gte).toEqual(new Date('2026-07-01'));
    expect(result!.lte).toEqual(new Date('2026-07-28'));
  });
});
