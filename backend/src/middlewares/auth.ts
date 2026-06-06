import { Request, Response, NextFunction } from 'express';
import { Usuario, Perfil } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: Omit<Usuario, 'senha'>;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ message: 'Token de autenticação ausente' });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ message: 'Token malformatado. Use o formato: Bearer <TOKEN>' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    
    // Buscar o usuário no banco de dados para garantir que ele existe e obter os dados mais atualizados
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    });

    if (!usuario) {
      res.status(401).json({ message: 'Usuário não encontrado' });
      return;
    }

    // Injetar usuário na requisição (removendo a senha por segurança)
    const { senha, ...usuarioSemSenha } = usuario;
    req.user = usuarioSemSenha;

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido ou expirado' });
    return;
  }
}

export function roleMiddleware(allowedRoles: Perfil[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Não autorizado' });
      return;
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      res.status(403).json({ message: 'Acesso negado: permissão insuficiente' });
      return;
    }

    next();
  };
}
