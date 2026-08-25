import { describe, it, expect } from 'vitest';
import { formatBRL, formatDecimal } from './format';

const NBSP = '\xa0';

describe('formatBRL', () => {
  it('formata números inteiros', () => {
    expect(formatBRL(1794)).toBe(`R$${NBSP}1.794,00`);
  });

  it('formata números com decimais', () => {
    expect(formatBRL(7018.50)).toBe(`R$${NBSP}7.018,50`);
  });

  it('formata centavos sozinhos', () => {
    expect(formatBRL(0.5)).toBe(`R$${NBSP}0,50`);
  });

  it('formata zero', () => {
    expect(formatBRL(0)).toBe(`R$${NBSP}0,00`);
  });

  it('formata valores grandes (milhões)', () => {
    expect(formatBRL(1234567.89)).toBe(`R$${NBSP}1.234.567,89`);
  });

  it('formata valores negativos (inclui sinal de menos)', () => {
    const result = formatBRL(-500);
    expect(result).toContain('500,00');
    expect(result.startsWith('-')).toBe(true);
  });
});

describe('formatDecimal', () => {
  it('formata com separador pt-BR', () => {
    expect(formatDecimal(1794)).toBe('1.794,00');
  });

  it('formata com decimais', () => {
    expect(formatDecimal(50.5)).toBe('50,50');
  });

  it('formata zero', () => {
    expect(formatDecimal(0)).toBe('0,00');
  });
});
