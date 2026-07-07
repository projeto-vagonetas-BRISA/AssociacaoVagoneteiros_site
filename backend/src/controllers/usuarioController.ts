import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        telefone: true,
        perfil: true,
        historico: true,
        data_associacao: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { passeios: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
}

export async function buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        telefone: true,
        perfil: true,
        historico: true,
        data_associacao: true,
        createdAt: true,
        updatedAt: true,
        passeios: {
          select: { id: true, data: true, valor: true, capacidade: true },
          orderBy: { data: 'asc' },
        },
      },
    });

    if (!usuario) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ message: 'Erro ao buscar usuário' });
  }
}

export async function atualizarPerfil(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { id } });
    if (!usuarioExistente) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    const { perfil } = req.body;
    const perfisValidos = ['USUARIO', 'ADMIN', 'REDATOR'];

    if (!perfil || !perfisValidos.includes(perfil)) {
      res.status(400).json({
        message: `Perfil inválido. Valores permitidos: ${perfisValidos.join(', ')}`,
      });
      return;
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: { perfil: perfil as any },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        telefone: true,
        perfil: true,
        historico: true,
        data_associacao: true,
      },
    });

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao atualizar perfil do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

export async function deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    // Não permitir auto-deleção
    if (id === req.user!.id) {
      res.status(400).json({ message: 'Você não pode deletar sua própria conta' });
      return;
    }

    const usuarioExistente = await prisma.usuario.findUnique({ where: { id } });
    if (!usuarioExistente) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    await prisma.usuario.delete({ where: { id } });
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ message: 'Erro ao deletar usuário' });
  }
}
