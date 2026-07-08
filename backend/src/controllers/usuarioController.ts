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
        experiencia: true,
        ativo: true,
        data_associacao: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { passeios: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
}

export async function listarVagoneteiros(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;

    const where = { perfil: 'USUARIO' as const };

    const [vagoneteiros, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id: true,
          name: true,
          cpf: true,
          email: true,
          telefone: true,
          historico: true,
          experiencia: true,
          ativo: true,
          data_associacao: true,
          foto: true,
          _count: { select: { passeios: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.usuario.count({ where }),
    ]);

    // Converter foto Bytes → string base64
    const data = vagoneteiros.map(({ foto, ...rest }) => ({
      ...rest,
      foto: foto ? Buffer.from(foto).toString('base64') : null,
    }));

    res.json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Erro ao listar vagoneteiros:', error);
    res.status(500).json({ message: 'Erro ao listar vagoneteiros' });
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
        experiencia: true,
        ativo: true,
        data_associacao: true,
        foto: true,
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

    res.json({
      ...usuario,
      foto: usuario.foto ? Buffer.from(usuario.foto).toString('base64') : null,
    });
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

export async function alternarAtivo(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: { ativo: !usuario.ativo },
      select: { id: true, name: true, ativo: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao alternar status:', error);
    res.status(500).json({ message: 'Erro ao alternar status do vagoneteiro' });
  }
}

export async function deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

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
