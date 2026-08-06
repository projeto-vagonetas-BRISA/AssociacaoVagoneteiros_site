import { vi } from 'vitest';

/**
 * Cria um mock profundo do PrismaClient (singleton) com um vi.fn() por método
 * de cada modelo. Todos os controllers/serviços usam `../lib/prisma` (default ou
 * export nomeada `prisma`), então um único mock cobre o app inteiro.
 */
export function createPrismaMock() {
  // Modelos usados em controllers/services do backend
  const modelNames = [
    'usuario',
    'passeio',
    'clientes',
    'cliente',
    'agendamento',
    'avaliacao',
    'avaliacaoCache',
    'slotPasseio',
    'slotInstancia',
    'slotAtribuicao',
    'pushSubscription',
    'notificacaoAgendamento',
    'resetToken',
  ];

  const model: Record<string, any> = {};
  const methods = [
    'findUnique', 'findFirst', 'findMany', 'create', 'update', 'delete',
    'updateMany', 'deleteMany', 'count', 'aggregate', 'upsert',
  ];

  for (const name of modelNames) {
    model[name] = {};
    for (const m of methods) {
      model[name][m] = vi.fn();
    }
  }

  return {
    model,
    lib: {
      default: model,
      prisma: model,
    },
  };
}
