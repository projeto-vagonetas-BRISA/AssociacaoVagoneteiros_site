/**
 * Serviço de atribuições de vagoneteiros — lógica de negócio reutilizável.
 *
 * Encapsula a sincronização entre a "slot-instância" (modelo Uber de atribuição)
 * e o "passeio público" equivalente que os turistas agendam. Isso elimina a
 * duplicação de código entre os handlers do atribuicaoController e centraliza
 * as regras de capacidade/status num único lugar.
 */
import prisma from '../lib/prisma';
import type { Prisma } from '@prisma/client';

interface SlotBasico {
  valor: number;
  capacidade: number;
  data: Date;
  horaInicio: string;
}

/**
 * Busca o passeio público equivalente a uma slot-instância.
 * Primeiro tenta por slotInstanciaId; se não achar, tenta por data+horário.
 */
export async function buscarPasseioPublico(instanciaId: number, vagoneteiroId?: number, slot?: SlotBasico) {
  const porInstancia = await prisma.passeio.findFirst({
    where: { slotInstanciaId: instanciaId },
  });
  if (porInstancia) return porInstancia;

  if (slot && vagoneteiroId) {
    return prisma.passeio.findFirst({
      where: {
        data: slot.data,
        horario: slot.horaInicio,
        usuarioId: vagoneteiroId,
        ativo: true,
        status: { not: 'CANCELADO' },
      },
    });
  }
  return null;
}

/**
 * Ao atribuir um vagoneteiro, garante que existe um passeio público
 * equivalente com a capacidade do slot somada (ou cria um novo).
 */
export async function sincronizarAposAtribuicao(params: {
  instanciaId: number;
  vagoneteiroId: number;
  valor: Prisma.Decimal;
  capacidade: number;
  data: Date;
  horaInicio: string;
}) {
  const { instanciaId, vagoneteiroId, valor, capacidade, data, horaInicio } = params;
  const existente = await buscarPasseioPublico(instanciaId);

  if (existente) {
    await prisma.passeio.update({
      where: { id: existente.id },
      data: { capacidade: existente.capacidade + capacidade },
    });
    return;
  }

  await prisma.passeio.create({
    data: {
      usuarioId: vagoneteiroId,
      preco: valor,
      capacidade,
      data,
      horario: horaInicio,
      ativo: true,
      status: 'CONFIRMADO',
      slotInstanciaId: instanciaId,
    },
  });
}

/**
 * Ao cancelar uma atribuição, reduz a capacidade do passeio público
 * equivalente; se zerar, cancela o passeio e seus agendamentos.
 */
export async function sincronizarAposCancelamento(params: {
  instanciaId: number | null;
  capacidadeSlot: number;
}) {
  const { instanciaId, capacidadeSlot } = params;
  if (!instanciaId) return;
  const passeio = await buscarPasseioPublico(instanciaId);

  if (!passeio) return;

  const novaCapacidade = passeio.capacidade - capacidadeSlot;
  if (novaCapacidade <= 0) {
    await prisma.passeio.update({
      where: { id: passeio.id },
      data: { capacidade: 0, status: 'CANCELADO' },
    });
    await prisma.agendamento.updateMany({
      where: { passeioId: passeio.id, status: { not: 'CANCELADO' } },
      data: { status: 'CANCELADO' },
    });
    return;
  }

  await prisma.passeio.update({
    where: { id: passeio.id },
    data: { capacidade: novaCapacidade },
  });
}

/**
 * Ao realizar uma atribuição, marca o passeio público equivalente e seus
 * agendamentos como REALIZADO.
 */
export async function sincronizarAposRealizacao(params: {
  instanciaId: number | null;
  vagoneteiroId: number | null;
  data: Date;
  horaInicio: string;
}) {
  const { instanciaId, vagoneteiroId, data, horaInicio } = params;
  if (!instanciaId || !vagoneteiroId) return;
  const passeio = await buscarPasseioPublico(instanciaId, vagoneteiroId, {
    valor: 0,
    capacidade: 0,
    data,
    horaInicio,
  });

  if (!passeio) return;

  await prisma.passeio.update({
    where: { id: passeio.id },
    data: { status: 'REALIZADO' },
  });

  await prisma.agendamento.updateMany({
    where: { passeioId: passeio.id, status: { not: 'CANCELADO' } },
    data: { status: 'REALIZADO' },
  });
}

/**
 * Soma as vagas ocupadas de um passeio público (turistas + acompanhantes).
 * Retorna 0 se não houver passeio equivalente.
 */
export async function contarVagasOcupadasDoPasseio(instanciaId: number | null) {
  if (!instanciaId) return 0;
  const passeio = await prisma.passeio.findFirst({
    where: {
      slotInstanciaId: instanciaId,
      ativo: true,
      status: { not: 'CANCELADO' },
    },
    include: {
      agendamentos: { where: { status: { notIn: ['CANCELADO'] } } },
    },
  });

  if (!passeio) return 0;
  return passeio.agendamentos.reduce((acc, a) => acc + 1 + (a.acompanhantes || 0), 0);
}
