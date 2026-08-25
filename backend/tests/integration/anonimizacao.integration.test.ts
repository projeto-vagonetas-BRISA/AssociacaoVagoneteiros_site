import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';
import { mockAuthSetup, mockAuthHeader } from './helpers/auth';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: vi.fn(),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

const { default: app } = await import('../../src/app');

function hasheAdmin() {
  return mockAuthHeader(prisma, mockVerifyToken, 'ADMIN');
}
function hasheVag() {
  return mockAuthHeader(prisma, mockVerifyToken, 'VAGONETEIRO');
}

describe('INTEGRAÇÃO — Anonimização LGPD (/anonimizacao)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('POST /anonimizacao sem token retorna 401', async () => {
    const res = await request(app).post('/anonimizacao').send({ identificador: 'x' });
    expect(res.status).toBe(401);
  });

  it('POST /anonimizacao retorna 403 para VAGONETEIRO (privativo ADMIN)', async () => {
    hasheVag();
    const res = await request(app)
      .post('/anonimizacao')
      .set('Authorization', 'Bearer token-VAGONETEIRO')
      .send({ identificador: 'x' });
    expect(res.status).toBe(403);
  });

  it('POST /anonimizacao requer identificador', async () => {
    hasheAdmin();
    const res = await request(app)
      .post('/anonimizacao')
      .set('Authorization', 'Bearer token-ADMIN')
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /anonimizacao retorna 404 quando não encontra ninguém', async () => {
    hasheAdmin();
    // auth procura por id (admin) → existe; anonimização por cpf/email → null
    prisma.model.usuario.findUnique.mockImplementation(({ where }: any) =>
      where.id ? Promise.resolve({ id: 1, perfil: 'ADMIN', tokenVersion: 0 }) : Promise.resolve(null)
    );
    prisma.model.clientes.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/anonimizacao')
      .set('Authorization', 'Bearer token-ADMIN')
      .send({ identificador: 'nao.existe@email.com' });
    expect(res.status).toBe(404);
  });

  it('POST /anonimizacao anonimiza um CLIENTE por email', async () => {
    hasheAdmin();
    // auth por id → admin; usuario por cpf/email → null; cliente por email → 16
    prisma.model.usuario.findUnique.mockImplementation(({ where }: any) =>
      where.id ? Promise.resolve({ id: 1, perfil: 'ADMIN', tokenVersion: 0 }) : Promise.resolve(null)
    );
    prisma.model.clientes.findUnique.mockImplementation(({ where }: any) =>
      where.id || where.email
        ? Promise.resolve({ id: 16, nome: 'Luísa Cordeiro', anonimizado: false })
        : Promise.resolve(null)
    );

    prisma.model.clientes.update.mockResolvedValue({ id: 16 });
    prisma.model.pushSubscription.deleteMany.mockResolvedValue({ count: 2 });
    prisma.model.avaliacao.updateMany.mockResolvedValue({ count: 3 });

    const res = await request(app)
      .post('/anonimizacao')
      .set('Authorization', 'Bearer token-ADMIN')
      .send({ identificador: 'turista0@email.com' });

    expect(res.status).toBe(200);
    expect(res.body.tipo).toBe('CLIENTE');
    expect(res.body.afetados.avaliacoes).toBe(3);
    expect(prisma.model.clientes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 16 },
        data: expect.objectContaining({ anonimizado: true, cpf: '00000000016' }),
      }),
    );
  });

  it('POST /anonimizacao anonimiza um USUARIO por CPF', async () => {
    hasheAdmin();
    // auth por id → admin; usuario por cpf → 40
    prisma.model.usuario.findUnique.mockImplementation(({ where }: any) =>
      where.cpf ? Promise.resolve({ id: 40, name: 'João Silva', anonimizado: false })
        : Promise.resolve({ id: 1, perfil: 'ADMIN', tokenVersion: 0 })
    );

    prisma.model.usuario.update.mockResolvedValue({ id: 40 });
    prisma.model.resetToken.deleteMany.mockResolvedValue({ count: 0 });
    prisma.model.passeio.updateMany.mockResolvedValue({ count: 72 });
    prisma.model.slotPasseio.updateMany.mockResolvedValue({ count: 3 });

    const res = await request(app)
      .post('/anonimizacao')
      .set('Authorization', 'Bearer token-ADMIN')
      .send({ identificador: '24160980716' });

    expect(res.status).toBe(200);
    expect(res.body.tipo).toBe('USUARIO');
    expect(res.body.afetados.passeios).toBe(72);
    expect(prisma.model.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 40 },
        data: expect.objectContaining({ anonimizado: true, ativo: false }),
      }),
    );
  });
});
