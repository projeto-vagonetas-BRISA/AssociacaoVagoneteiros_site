/**
 * Formata valor numérico para moeda brasileira (R$ 1.234,56)
 */
export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata valor sem o símbolo R$, apenas com separador pt-BR (1.234,56)
 */
export function formatDecimal(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
