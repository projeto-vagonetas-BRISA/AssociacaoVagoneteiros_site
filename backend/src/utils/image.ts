/**
 * Helper para processamento de imagens base64
 */

const MAX_FOTO_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Converte uma string base64 (com ou sem prefixo data:image) em Buffer.
 * Retorna null se o valor for null/undefined.
 * Lança Error se exceder o tamanho máximo.
 */
export function parseBase64Image(
  foto: string | null | undefined,
  maxBytes = MAX_FOTO_BYTES,
): Buffer | null {
  if (foto === null || foto === undefined) return null;

  // Aceita formato "data:image/...;base64,..." ou base64 puro
  const base64Data = foto.includes('base64,') ? foto.split('base64,')[1] : foto;
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > maxBytes) {
    throw new Error('A foto deve ter no máximo 5MB');
  }

  return buffer;
}

/**
 * Converte um Buffer de foto para string base64.
 * Retorna null se o buffer for null.
 */
export function fotoParaBase64(foto: Buffer | null | Uint8Array | undefined): string | null {
  if (!foto) return null;
  return Buffer.from(foto).toString('base64');
}
