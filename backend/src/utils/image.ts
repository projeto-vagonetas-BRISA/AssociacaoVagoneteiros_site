/**
 * helper para processamento de imagens base64
 */

const MAX_FOTO_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * converte uma string base64 (com ou sem prefixo data:image) em buffer.
 * retorna null se o valor for null/undefined.
 * lança error se exceder o tamanho máximo.
 */
export function parseBase64Image(
  foto: string | null | undefined,
  maxBytes = MAX_FOTO_BYTES,
): Buffer | null {
  if (foto === null || foto === undefined) return null;

  // aceita formato "data:image/...;base64,..." ou base64 puro
  const base64Data = foto.includes('base64,') ? foto.split('base64,')[1] : foto;
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > maxBytes) {
    throw new Error('A foto deve ter no máximo 5MB');
  }

  return buffer;
}

/**
 * converte um buffer de foto para string base64.
 * retorna null se o buffer for null.
 */
export function fotoParaBase64(foto: Buffer | null | Uint8Array | undefined): string | null {
  if (!foto) return null;
  return Buffer.from(foto).toString('base64');
}
