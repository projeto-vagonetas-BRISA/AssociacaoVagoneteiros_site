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
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 9));
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
          select: { id: true, data: true, preco: true, capacidade: true, horario: true },
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
    const perfisValidos = ['USUARIO', 'VAGONETEIRO', 'ADMIN', 'REDATOR'];

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

export async function atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
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

    const { name, email, telefone, historico, experiencia, foto } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email || null;
    if (telefone !== undefined) data.telefone = telefone;
    if (historico !== undefined) data.historico = historico || null;
    if (experiencia !== undefined) data.experiencia = experiencia || null;
    if (foto !== undefined) {
      if (foto === null) {
        data.foto = null;
      } else {
        const base64Data = foto.includes('base64,') ? foto.split('base64,')[1] : foto;
        const fotoBuffer = Buffer.from(base64Data, 'base64');
        if (fotoBuffer.length > 5 * 1024 * 1024) {
          res.status(400).json({ message: 'A foto deve ter no máximo 5MB' });
          return;
        }
        data.foto = fotoBuffer;
      }
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data,
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
      },
    });

    res.json({
      ...updated,
      foto: updated.foto ? Buffer.from(updated.foto).toString('base64') : null,
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
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
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    if (error?.code === 'P2003') {
      res.status(400).json({
        message: 'Usuário não pode ser deletado pois possui passeios ou dados associados',
      });
      return;
    }
    res.status(500).json({ message: 'Erro ao deletar usuário' });
  }
}
