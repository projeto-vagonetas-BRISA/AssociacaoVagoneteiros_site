/**
 * Converte parametros inicio/fim string para Date,
 * ajustando o fim para o final do dia no timezone local.
 */
export function parseFiltroData(inicio?: string, fim?: string): { gte?: Date; lte?: Date } | undefined {
  if (!inicio || !fim) return undefined;
  const gte = new Date(inicio);
  // fim vira 00:00 do dia seguinte pra cobrir o dia todo no UTC
  const lte = new Date(fim);
  lte.setDate(lte.getDate() + 1);
  return { gte, lte };
}
