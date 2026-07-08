import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (isProduction) {
    throw new Error('FATAL: A variável de ambiente JWT_SECRET precisa ser configurada em produção!');
  }
  console.warn('AVISO: JWT_SECRET não configurado. Utilizando chave padrão insegura para desenvolvimento.');
}

const activeSecret = JWT_SECRET || 'segredo_padrao_vagoneteiros_2026';


export interface TokenPayload {
  id: number;
  cpf: string;
  email: string | null;
  perfil: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, activeSecret, { expiresIn: '24h' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, activeSecret) as TokenPayload;
}
