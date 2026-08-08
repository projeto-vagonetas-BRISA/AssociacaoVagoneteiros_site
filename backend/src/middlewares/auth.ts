import { Request, Response, NextFunction } from 'express';
import { Usuario, Perfil } from '@prisma/client';
import { verifyToken, TokenPayload } from '../utils/jwt';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: Omit<Usuario, 'senha'>;
}

/**
 * Cria um objeto user parcial a partir do payload do JWT.
 * Não busca no banco — usa apenas os dados contidos no token.
 * Rotas que precisam de dados atualizados do banco devem buscá-los explicitamente.
 */
function payloadToUser(payload: TokenPayload): Omit<Usuario, 'senha'> {
  return {
    id: payload.id,
    cpf: payload.cpf,
    email: payload.email,
    tokenVersion: payload.tokenVersion ?? 0,
    perfil: payload.perfil as Perfil,
    name: '',
    telefone: '',
    historico: null,
    experiencia: null,
    ativo: true,
    data_associacao: new Date(),
    foto: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
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
    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });

    if (!usuario) {
      res.status(401).json({ message: 'Token inválido ou expirado' });
      return;
    }

    const payloadVersion = decoded.tokenVersion ?? 0;
    if (usuario.tokenVersion !== payloadVersion) {
      res.status(401).json({ message: 'Token inválido ou expirado' });
      return;
    }

    req.user = payloadToUser(decoded);
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

export function adminOrSelfMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Não autorizado' });
    return;
  }

  const id = Number(req.params.id);
  if (req.user.perfil === 'ADMIN' || (!isNaN(id) && req.user.id === id)) {
    next();
    return;
  }

  res.status(403).json({ message: 'Acesso negado: permissão insuficiente' });
}

