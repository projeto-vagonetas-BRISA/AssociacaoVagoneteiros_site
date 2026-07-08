import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const avaliacoes = await prisma.avaliacao.findMany({
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(avaliacoes);
  } catch (error) {
    console.error('Erro ao listar avaliações:', error);
    res.status(500).json({ message: 'Erro ao listar avaliações' });
  }
}

export async function buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const avaliacao = await prisma.avaliacao.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true, valor: true } },
      },
    });

    if (!avaliacao) {
      res.status(404).json({ message: 'Avaliação não encontrada' });
      return;
    }

    res.json(avaliacao);
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ message: 'Erro ao buscar avaliação' });
  }
}

export async function criar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { nota, comentario, clienteId, passeioId } = req.body;

    if (!nota || !clienteId || !passeioId) {
      res.status(400).json({ message: 'Nota, clienteId e passeioId são obrigatórios' });
      return;
    }

    const parsedNota = parseInt(nota, 10);
    if (isNaN(parsedNota) || parsedNota < 1 || parsedNota > 5) {
      res.status(400).json({ message: 'Nota deve ser um número entre 1 e 5' });
      return;
    }

    const parsedClienteId = Number(clienteId);
    const parsedPasseioId = Number(passeioId);

    if (isNaN(parsedClienteId) || isNaN(parsedPasseioId)) {
      res.status(400).json({ message: 'IDs inválidos' });
      return;
    }

    // Verificar se cliente existe
    const cliente = await prisma.clientes.findUnique({ where: { id: parsedClienteId } });
    if (!cliente) {
      res.status(404).json({ message: 'Cliente não encontrado' });
      return;
    }

    // Verificar se passeio existe
    const passeio = await prisma.passeio.findUnique({ where: { id: parsedPasseioId } });
    if (!passeio) {
      res.status(404).json({ message: 'Passeio não encontrado' });
      return;
    }

    // Verificar se cliente tem agendamento confirmado neste passeio
    const agendamentoConfirmado = await prisma.agendamento.findFirst({
      where: {
        clienteId: parsedClienteId,
        passeioId: parsedPasseioId,
        status: 'CONFIRMADO',
      },
    });
    if (!agendamentoConfirmado) {
      res.status(400).json({ message: 'Cliente não possui um agendamento confirmado para este passeio' });
      return;
    }

    // Verificar se cliente já avaliou este passeio
    const jaAvaliou = await prisma.avaliacao.findFirst({
      where: { clienteId: parsedClienteId, passeioId: parsedPasseioId },
    });
    if (jaAvaliou) {
      res.status(400).json({ message: 'Cliente já avaliou este passeio' });
      return;
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        nota: parsedNota,
        comentario: comentario || '',
        clienteId: parsedClienteId,
        passeioId: parsedPasseioId,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true } },
      },
    });

    res.status(201).json(avaliacao);
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ message: 'Erro ao criar avaliação' });
  }
}

export async function atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const avaliacaoExistente = await prisma.avaliacao.findUnique({ where: { id } });
    if (!avaliacaoExistente) {
      res.status(404).json({ message: 'Avaliação não encontrada' });
      return;
    }

    const { nota, comentario } = req.body;
    const dataAtualizada: any = {};

    if (nota !== undefined) {
      const parsed = parseInt(nota, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 5) {
        res.status(400).json({ message: 'Nota deve ser um número entre 1 e 5' });
        return;
      }
      dataAtualizada.nota = parsed;
    }
    if (comentario !== undefined) {
      dataAtualizada.comentario = comentario;
    }

    const avaliacao = await prisma.avaliacao.update({
      where: { id },
      data: dataAtualizada,
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true } },
      },
    });

    res.json(avaliacao);
  } catch (error) {
    console.error('Erro ao atualizar avaliação:', error);
    res.status(500).json({ message: 'Erro ao atualizar avaliação' });
  }
}

export async function deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const avaliacaoExistente = await prisma.avaliacao.findUnique({ where: { id } });
    if (!avaliacaoExistente) {
      res.status(404).json({ message: 'Avaliação não encontrada' });
      return;
    }

    await prisma.avaliacao.delete({ where: { id } });
    res.json({ message: 'Avaliação deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar avaliação:', error);
    res.status(500).json({ message: 'Erro ao deletar avaliação' });
  }
}
