// Utilitário de exportação CSV.
// Gera um arquivo .csv no padrão RFC 4180 (separador ';', UTF-8 com BOM
// para abrir corretamente no Excel em pt-BR).

/** Escapa um valor para célula de CSV (aspas duplas quando necessário). */
function escaparCelula(valor: unknown): string {
  const str = valor === null || valor === undefined ? '' : String(valor);
  // Se contém separador, aspas ou quebra de linha, envolve em aspas duplas
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converte linhas (arrays de valores) em CSV e dispara o download.
 * @param nomeArquivo nome do arquivo, ex: "relatorio.csv"
 * @param linhas matriz de valores (uma linha por array). Não escapa headers.
 */
export function exportarCSV(nomeArquivo: string, linhas: unknown[][]): void {
  const conteudo = linhas
    .map((linha) => linha.map(escaparCelula).join(';'))
    .join('\r\n');

  // BOM UTF-8: garante acentuação correta ao abrir no Excel
  const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
