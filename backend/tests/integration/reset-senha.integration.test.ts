import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers/prismaMock';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma', () => prisma.lib);

const mockEnviarReset = vi.fn();
vi.mock('../../src/utils/email', () => ({
  enviarEmailResetSenha: (...a: any[]) => mockEnviarReset(...a),
}));

const mockHash = vi.fn();
vi.mock('bcrypt', () => ({
  default: { hash: (...a: any[]) => mockHash(...a), compare: vi.fn() },
}));

const { default: app } = await import('../../src/app');

describe('INTEGRAÇÃO — Reset de senha (/auth/esqueci-senha, /auth/redefinir-senha)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHash.mockResolvedValue('hash_novo');
  });

  it('POST /auth/esqueci-senha sem email retorna 400', async () => {
    const res = await request(app).post('/auth/esqueci-senha').send({});
    expect(res.status).toBe(400);
  });

  it('POST /auth/esqueci-senha com email não cadastrado não revela existência', async () => {
    prisma.model.usuario.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/auth/esqueci-senha').send({ email: 'naoexiste@x.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Se este e-mail estiver cadastrado');
    // não chamou create/enviar
    expect(prisma.model.resetToken.create).not.toHaveBeenCalled();
    expect(mockEnviarReset).not.toHaveBeenCalled();
  });

  it('POST /auth/esqueci-senha gera token, invalida anteriores e envia email', async () => {
    // perfil VAGONETEIRO → fluxo de geração de link automática (envia email)
    prisma.model.usuario.findUnique.mockResolvedValue({ id: 1, name: 'João', email: 'joao@x.com', perfil: 'VAGONETEIRO' });
    prisma.model.resetToken.updateMany.mockResolvedValue({ count: 0 });
    prisma.model.resetToken.create.mockResolvedValue({ id: 1, email: 'joao@x.com', token: 'abc', expiraEm: new Date() });

    const res = await request(app).post('/auth/esqueci-senha').send({ email: 'joao@x.com' });
    expect(res.status).toBe(200);
    expect(prisma.model.resetToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ email: 'joao@x.com', usado: false }) }),
    );
    expect(prisma.model.resetToken.create).toHaveBeenCalled();
    expect(mockEnviarReset).toHaveBeenCalledWith('joao@x.com', 'João', expect.any(String));
  });

  it('POST /auth/redefinir-senha sem token/novaSenha retorna 400', async () => {
    const res = await request(app).post('/auth/redefinir-senha').send({ token: 'abc' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/redefinir-senha com senha curta retorna 400', async () => {
    const res = await request(app).post('/auth/redefinir-senha').send({ token: 'abc', novaSenha: '123' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/redefinir-senha com token expirado retorna 400', async () => {
    prisma.model.resetToken.findUnique.mockResolvedValue({
      id: 1, token: 'abc', usado: false, status: 'APPROVED', email: 'joao@x.com', expiraEm: new Date(Date.now() - 1000),
    });
    const res = await request(app).post('/auth/redefinir-senha').send({ token: 'abc', novaSenha: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('expirado');
  });

  it('POST /auth/redefinir-senha com token válido redefine a senha', async () => {
    prisma.model.resetToken.findUnique.mockResolvedValue({
      id: 1, token: 'abc', usado: false, status: 'APPROVED', email: 'joao@x.com', expiraEm: new Date(Date.now() + 3600000),
    });
    prisma.model.usuario.findUnique.mockResolvedValue({ id: 1, email: 'joao@x.com', tokenVersion: 0 });
    prisma.model.usuario.update.mockResolvedValue({ id: 1 });
    prisma.model.resetToken.update.mockResolvedValue({ id: 1, usado: true });

    const res = await request(app).post('/auth/redefinir-senha').send({ token: 'abc', novaSenha: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('redefinida com sucesso');
    expect(prisma.model.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ senha: 'hash_novo' }) }),
    );
    expect(prisma.model.resetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usado: true, status: 'COMPLETED' }) }),
    );
  });

  it('POST /auth/redefinir-senha com token já usado retorna 400', async () => {
    prisma.model.resetToken.findUnique.mockResolvedValue({
      id: 1, token: 'abc', usado: true, email: 'joao@x.com', expiraEm: new Date(Date.now() + 3600000),
    });
    const res = await request(app).post('/auth/redefinir-senha').send({ token: 'abc', novaSenha: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('inválido ou já utilizado');
  });
});
