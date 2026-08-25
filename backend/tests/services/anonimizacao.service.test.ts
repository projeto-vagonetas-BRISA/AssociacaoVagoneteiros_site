import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateMany = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('../../src/lib/prisma', () => ({
  default: {
    usuario: { findUnique: mockFindUnique, update: mockUpdate },
    clientes: { findUnique: mockFindUnique, update: mockUpdate },
    passeio: { updateMany: mockUpdateMany },
    slotPasseio: { updateMany: mockUpdateMany },
    resetToken: { deleteMany: mockDeleteMany },
    pushSubscription: { deleteMany: mockDeleteMany },
    avaliacao: { updateMany: mockUpdateMany },
  },
  prisma: {
    usuario: { findUnique: mockFindUnique, update: mockUpdate },
    clientes: { findUnique: mockFindUnique, update: mockUpdate },
    passeio: { updateMany: mockUpdateMany },
    slotPasseio: { updateMany: mockUpdateMany },
    resetToken: { deleteMany: mockDeleteMany },
    pushSubscription: { deleteMany: mockDeleteMany },
    avaliacao: { updateMany: mockUpdateMany },
  },
}));

const { anonimizarUsuario, anonimizarCliente } = await import('../../src/services/anonimizacao.service');

describe('anonimizacao.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('anonimizarUsuario', () => {
    it('lança erro se usuário não existe', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(anonimizarUsuario(40)).rejects.toThrow('Usuário não encontrado');
    });

    it('lança erro se usuário já anonimizado', async () => {
      mockFindUnique.mockResolvedValue({ id: 40, anonimizado: true });
      await expect(anonimizarUsuario(40)).rejects.toThrow('já foi anonimizado');
    });

    it('substitui dados pessoais, bloqueia login, revoga tokens e desvincula passeios/slots', async () => {
      mockFindUnique.mockResolvedValue({ id: 40, name: 'João Silva', anonimizado: false });
      mockUpdate.mockResolvedValue({ id: 40 });
      mockDeleteMany.mockResolvedValue({ count: 2 });
      mockUpdateMany.mockResolvedValue({ count: 72 }); // passeio
      mockUpdateMany.mockResolvedValueOnce({ count: 72 }); // passeio

      const resultado = await anonimizarUsuario(40);

      // substituição completa de dados pessoais + bloqueio de login
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 40 },
          data: expect.objectContaining({
            name: 'Usuário anônimo',
            cpf: '00000000040',
            email: 'anonimizado_40@excluido.local',
            telefone: '0000000000',
            senha: '[removida por LGPD]',
            ativo: false,
            anonimizado: true,
          }),
        }),
      );
      // desvincula passeios e slots (mantém registros p/ relatórios)
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuarioId: 40 }, data: { usuarioId: null } }),
      );
      expect(resultado.afetados.passeios).toBe(72);
    });
  });

  describe('anonimizarCliente', () => {
    it('lança erro se cliente não existe', async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(anonimizarCliente(16)).rejects.toThrow('Cliente não encontrado');
    });

    it('anonimiza cliente, remove pushes e anonimiza comentários de avaliações', async () => {
      mockFindUnique.mockResolvedValue({ id: 16, nome: 'Luísa', anonimizado: false });
      mockUpdate.mockResolvedValue({ id: 16 });
      mockDeleteMany.mockResolvedValue({ count: 3 }); // pushSubscription
      mockUpdateMany.mockResolvedValue({ count: 5 }); // avaliacao

      const resultado = await anonimizarCliente(16);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 16 },
          data: expect.objectContaining({
            nome: 'Cliente anônimo',
            cpf: '00000000016',
            email: 'anonimizado_16@excluido.local',
            anonimizado: true,
          }),
        }),
      );
      expect(mockDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clienteId: 16 } }),
      );
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clienteId: 16 }, data: { comentario: expect.stringContaining('LGPD') } }),
      );
      expect(resultado.afetados.avaliacoes).toBe(5);
    });
  });
});
