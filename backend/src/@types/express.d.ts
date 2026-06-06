import { Usuario } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<Usuario, 'senha'>;
    }
  }
}
