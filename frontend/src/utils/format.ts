/**
 * formata valor numérico para moeda brasileira (r$ 1.234,56)
 */
export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * formata valor sem o símbolo r$, apenas com separador pt-br (1.234,56)
 */
export function formatDecimal(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
