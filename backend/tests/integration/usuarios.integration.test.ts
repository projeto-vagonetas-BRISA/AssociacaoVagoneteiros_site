import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';
import { mockAuthSetup } from './helpers/auth';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockVerifyToken = vi.fn();
vi.mock('../../src/utils/jwt', () => ({
  generateToken: vi.fn(),
  verifyToken: (...a: any[]) => mockVerifyToken(...a),
}));

const { default: app } = await import('../../src/app');

const adminToken = 'Bearer token-admin';
const redatorToken = 'Bearer token-redator';
const userToken = 'Bearer token-user';

const usuarioBase = {
  id: 1, name: 'João', cpf: '12345678909', email: null, telefone: '99999',
  perfil: 'VAGONETEIRO', ativo: true, foto: null, tokenVersion: 0,
  createdAt: new Date(), updatedAt: new Date(), historico: null, experiencia: null,
};

describe('INTEGRAÇÃO — Usuários (/usuarios)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
  });

  it('GET /usuarios sem token retorna 401', async () => {
    const res = await request(app).get('/usuarios');
    expect(res.status).toBe(401);
  });

  it('GET /usuarios com VAGONETEIRO retorna 403 (role ADMIN)', async () => {
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'VAGONETEIRO', id: 5 });
    const res = await request(app).get('/usuarios').set('Authorization', userToken);
    expect(res.status).toBe(403);
  });

  it('GET /usuarios (admin) lista usuários', async () => {
    prisma.model.usuario.findMany.mockResolvedValue([usuarioBase]);
    const res = await request(app).get('/usuarios').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('GET /usuarios/vagoneteiros filtra por perfil e converte foto', async () => {
    prisma.model.usuario.findMany.mockResolvedValue([{ ...usuarioBase, foto: Buffer.from('f') }]);
    prisma.model.usuario.count.mockResolvedValue(1);
    const res = await request(app).get('/usuarios/vagoneteiros').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // foto convertida para base64 do buffer real ('f' -> 'Zg==')
    expect(res.body.data[0].foto).toBe('Zg==');
    expect(prisma.model.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ perfil: expect.anything() }) }),
    );
  });

  it('GET /usuarios/:id (adminOrSelf) admin obtém qualquer usuário', async () => {
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
    prisma.model.usuario.findUnique.mockResolvedValue({ ...usuarioBase, id: 7 });
    const res = await request(app).get('/usuarios/7').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(7);
  });

  it('PATCH /usuarios/vagoneteiros/:id/ativo alterna ativo', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue({ ...usuarioBase, ativo: true });
    prisma.model.usuario.update.mockResolvedValue({ ...usuarioBase, ativo: false });
    const res = await request(app)
      .patch('/usuarios/vagoneteiros/5/ativo')
      .set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(prisma.model.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ativo: false }) }),
    );
  });

  it('PATCH /usuarios/:id/perfil altera perfil válido', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue(usuarioBase);
    prisma.model.usuario.update.mockResolvedValue({ ...usuarioBase, perfil: 'REDATOR' });
    const res = await request(app)
      .patch('/usuarios/1/perfil')
      .set('Authorization', adminToken)
      .send({ perfil: 'REDATOR' });
    expect(res.status).toBe(200);
    expect(prisma.model.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ perfil: 'REDATOR' }) }),
    );
  });

  it('PATCH /usuarios/:id/perfil rejeita perfil inválido', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue(usuarioBase);
    const res = await request(app)
      .patch('/usuarios/1/perfil')
      .set('Authorization', adminToken)
      .send({ perfil: 'SUPERUSER' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Perfil inválido');
  });

  it('DELETE /usuarios/:id impede desativar a própria conta', async () => {
    // usuário logado é o id 1 (admin), tenta deletar o id 1
    const res = await request(app).delete('/usuarios/1').set('Authorization', adminToken);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('própria conta');
  });

  it('DELETE /usuarios/:id (admin) desativa outro usuário', async () => {
    mockAuthSetup(prisma, mockVerifyToken, { perfil: 'ADMIN', id: 1 });
    prisma.model.usuario.findUnique.mockResolvedValue({ ...usuarioBase, id: 7 });
    prisma.model.usuario.update.mockResolvedValue({ ...usuarioBase, id: 7, ativo: false });
    const res = await request(app).delete('/usuarios/7').set('Authorization', adminToken);
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('desativado');
    expect(prisma.model.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ativo: false }) }),
    );
  });
});
