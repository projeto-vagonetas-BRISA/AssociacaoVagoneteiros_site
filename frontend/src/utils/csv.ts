/** escapa um valor para célula de csv (aspas duplas quando necessário). */
function escaparCelula(valor: unknown): string {
  const str = valor === null || valor === undefined ? '' : String(valor);
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * converte linhas (arrays de valores) em csv e dispara o download.
 * @param nomeArquivo nome do arquivo, ex: "relatorio.csv"
 * @param linhas matriz de valores (uma linha por array). não escapa headers.
 */
export function exportarCSV(nomeArquivo: string, linhas: unknown[][]): void {
  const conteudo = linhas
    .map((linha) => linha.map(escaparCelula).join(';'))
    .join('\r\n');

  // bom utf-8: garante acentuação correta ao abrir no excel
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
