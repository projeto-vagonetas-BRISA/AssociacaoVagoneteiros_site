import prisma from '../lib/prisma';

export interface VagasInfo {
  ocupadas: number;
  disponiveis: number;
  capacidade: number;
}

/**
 * Calcula quantas vagas estão ocupadas e disponíveis em um passeio.
 * Cada agendamento ativo conta como 1 (o cliente) + acompanhantes.
 */
export async function calcularVagasDisponiveis(passeioId: number): Promise<VagasInfo> {
  const [passeio, agendamentos] = await Promise.all([
    prisma.passeio.findUnique({
      where: { id: passeioId },
      select: { capacidade: true },
    }),
    prisma.agendamento.findMany({
      where: { passeioId, status: { not: 'CANCELADO' } },
      select: { acompanhantes: true },
    }),
  ]);

  if (!passeio) {
    return { ocupadas: 0, disponiveis: 0, capacidade: 0 };
  }

  const capacidade = passeio.capacidade;
  const ocupadas = agendamentos.reduce((sum, a) => sum + 1 + a.acompanhantes, 0);

  return {
    ocupadas,
    disponiveis: capacidade - ocupadas,
    capacidade,
  };
}
