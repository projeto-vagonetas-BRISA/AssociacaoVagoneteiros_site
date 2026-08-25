import { vi } from 'vitest';

/**
 * Helper para mockar autenticação em testes de integração.
 *
 * O `authMiddleware` (src/middlewares/auth.ts) além de decodificar o token via
 * `verifyToken`, busca o usuário no banco (`prisma.usuario.findUnique`) e valida
 * o `tokenVersion` do payload contra o do registro. Para rotear, os testes
 * precisam mockar AMBOS: o `verifyToken` (payload) e o `findUnique` do usuário.
 *
 * Uso (dento de cada arquivo de teste, após mockar `../../src/utils/jwt`):
 *   mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
 */

export interface AuthUserOverrides {
  id?: number;
  cpf?: string;
  email?: string | null;
  perfil?: string;
  tokenVersion?: number;
}

/**
 * Configura o mockVerifyToken para retornar um payload com tokenVersion 0 e o
 * prisma.model.usuario.findUnique para devolver um usuário "existente"
 * compatível (id, perfil, tokenVersion). Chamar no beforeEach.
 */
export function mockAuthSetup(
  prisma: any,
  mockVerifyToken: any,
  overrides: AuthUserOverrides = {},
) {
  const {
    id = 1,
    cpf = '12345678909',
    email = null,
    perfil = 'ADMIN',
    tokenVersion = 0,
  } = overrides;

  // payload que o verifyToken deve "decodificar"
  mockVerifyToken.mockReturnValue({ id, cpf, email, perfil, tokenVersion });

  // usuário que o authMiddleware busca no banco (deve bater o tokenVersion)
  prisma.model.usuario.findUnique.mockResolvedValue({
    id,
    cpf,
    email,
    perfil,
    tokenVersion,
    name: '',
    telefone: '',
    foto: null,
    ativo: true,
    historico: null,
    experiencia: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Monta o header Authorization com o perfil desejado, já configurando o mock.
 * Retorna { Authorization: `Bearer ...` } para usar em .set().
 */
export function mockAuthHeader(
  prisma: any,
  mockVerifyToken: any,
  perfil: string,
  overrides: AuthUserOverrides = {},
) {
  mockAuthSetup(prisma, mockVerifyToken, { perfil, ...overrides });
  return { Authorization: `Bearer token-${perfil}` };
}
