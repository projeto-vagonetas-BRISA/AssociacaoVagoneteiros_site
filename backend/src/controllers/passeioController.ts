import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const passeios = await prisma.passeio.findMany({
      include: {
        usuario: { select: { id: true, name: true } },
        _count: { select: { agendamentos: true, avaliacoes: true } },
      },
      orderBy: { data: 'asc' },
    });
    res.json(passeios);
  } catch (error) {
    console.error('Erro ao listar passeios:', error);
    res.status(500).json({ message: 'Erro ao listar passeios' });
  }
}

export async function buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const passeio = await prisma.passeio.findUnique({
      where: { id },
      include: {
        usuario: { select: { id: true, name: true } },
        agendamentos: { include: { cliente: { select: { id: true, nome: true } } } },
        avaliacoes: { include: { cliente: { select: { id: true, nome: true } } } },
      },
    });

    if (!passeio) {
      res.status(404).json({ message: 'Passeio não encontrado' });
      return;
    }

    res.json(passeio);
  } catch (error) {
    console.error('Erro ao buscar passeio:', error);
    res.status(500).json({ message: 'Erro ao buscar passeio' });
  }
}

export async function criar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { valor, capacidade, data } = req.body;

    if (!valor || !capacidade || !data) {
      res.status(400).json({ message: 'Valor, capacidade e data são obrigatórios' });
      return;
    }

    const parsedValor = parseFloat(valor);
    const parsedCapacidade = parseInt(capacidade, 10);
    const parsedData = new Date(data);

    if (isNaN(parsedValor) || parsedValor <= 0) {
      res.status(400).json({ message: 'Valor inválido' });
      return;
    }
    if (isNaN(parsedCapacidade) || parsedCapacidade <= 0) {
      res.status(400).json({ message: 'Capacidade inválida' });
      return;
    }
    if (isNaN(parsedData.getTime())) {
      res.status(400).json({ message: 'Data inválida' });
      return;
    }

    // O vagoneteiro logado (USUARIO comum) pode criar passeio vinculado a ele;
    // ADMIN/REDATOR podem criar para qualquer usuarioId ou para si mesmos.
    const usuarioId = req.body.usuarioId
      ? (req.user!.perfil === 'ADMIN' || req.user!.perfil === 'REDATOR'
          ? Number(req.body.usuarioId)
          : req.user!.id)
      : req.user!.id;

    const passeio = await prisma.passeio.create({
      data: {
        valor: parsedValor,
        capacidade: parsedCapacidade,
        data: parsedData,
        usuarioId,
      },
      include: {
        usuario: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(passeio);
  } catch (error) {
    console.error('Erro ao criar passeio:', error);
    res.status(500).json({ message: 'Erro ao criar passeio' });
  }
}

export async function atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const passeioExistente = await prisma.passeio.findUnique({ where: { id } });
    if (!passeioExistente) {
      res.status(404).json({ message: 'Passeio não encontrado' });
      return;
    }

    // Apenas ADMIN/REDATOR ou o dono do passeio podem atualizar
    if (req.user!.perfil === 'USUARIO' && passeioExistente.usuarioId !== req.user!.id) {
      res.status(403).json({ message: 'Você só pode editar seus próprios passeios' });
      return;
    }

    const { valor, capacidade, data } = req.body;
    const dataAtualizada: any = {};

    if (valor !== undefined) {
      const parsed = parseFloat(valor);
      if (isNaN(parsed) || parsed <= 0) {
        res.status(400).json({ message: 'Valor inválido' });
        return;
      }
      dataAtualizada.valor = parsed;
    }
    if (capacidade !== undefined) {
      const parsed = parseInt(capacidade, 10);
      if (isNaN(parsed) || parsed <= 0) {
        res.status(400).json({ message: 'Capacidade inválida' });
        return;
      }
      dataAtualizada.capacidade = parsed;
    }
    if (data !== undefined) {
      const parsed = new Date(data);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ message: 'Data inválida' });
        return;
      }
      dataAtualizada.data = parsed;
    }

    const passeio = await prisma.passeio.update({
      where: { id },
      data: dataAtualizada,
      include: {
        usuario: { select: { id: true, name: true } },
      },
    });

    res.json(passeio);
  } catch (error) {
    console.error('Erro ao atualizar passeio:', error);
    res.status(500).json({ message: 'Erro ao atualizar passeio' });
  }
}

export async function deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const passeioExistente = await prisma.passeio.findUnique({ where: { id } });
    if (!passeioExistente) {
      res.status(404).json({ message: 'Passeio não encontrado' });
      return;
    }

    if (req.user!.perfil === 'USUARIO' && passeioExistente.usuarioId !== req.user!.id) {
      res.status(403).json({ message: 'Você só pode deletar seus próprios passeios' });
      return;
    }

    await prisma.passeio.delete({ where: { id } });
    res.json({ message: 'Passeio deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar passeio:', error);
    res.status(500).json({ message: 'Erro ao deletar passeio' });
  }
}
