import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';

// Helper para limpar CPF
function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const clientes = await prisma.clientes.findMany({
      include: {
        _count: { select: { agendamentos: true, avaliacoes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro ao listar clientes' });
  }
}

export async function buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const cliente = await prisma.clientes.findUnique({
      where: { id },
      include: {
        agendamentos: { include: { passeio: true } },
        avaliacoes: { include: { passeio: { select: { id: true, data: true } } } },
      },
    });

    if (!cliente) {
      res.status(404).json({ message: 'Cliente não encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ message: 'Erro ao buscar cliente' });
  }
}

export async function criar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { nome, cpf, telefone, email } = req.body;

    if (!nome || !cpf || !telefone) {
      res.status(400).json({ message: 'Nome, CPF e telefone são obrigatórios' });
      return;
    }

    const cleanedCpf = cleanCPF(cpf);
    if (cleanedCpf.length !== 11) {
      res.status(400).json({ message: 'CPF inválido. Deve conter 11 dígitos' });
      return;
    }

    const existente = await prisma.clientes.findUnique({ where: { cpf: cleanedCpf } });
    if (existente) {
      res.status(400).json({ message: 'Cliente com este CPF já está cadastrado' });
      return;
    }

    if (email) {
      const emailExistente = await prisma.clientes.findUnique({ where: { email } });
      if (emailExistente) {
        res.status(400).json({ message: 'E-mail já está em uso' });
        return;
      }
    }

    const cliente = await prisma.clientes.create({
      data: {
        nome,
        cpf: cleanedCpf,
        telefone,
        email: email || null,
      },
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro ao criar cliente' });
  }
}

export async function atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const clienteExistente = await prisma.clientes.findUnique({ where: { id } });
    if (!clienteExistente) {
      res.status(404).json({ message: 'Cliente não encontrado' });
      return;
    }

    const { nome, telefone, email } = req.body;
    const dataAtualizada: any = {};

    if (nome !== undefined) dataAtualizada.nome = nome;
    if (telefone !== undefined) dataAtualizada.telefone = telefone;
    if (email !== undefined) {
      // Verificar se o email já pertence a outro cliente
      if (email) {
        const emailExistente = await prisma.clientes.findFirst({
          where: { email, id: { not: id } },
        });
        if (emailExistente) {
          res.status(400).json({ message: 'E-mail já está em uso por outro cliente' });
          return;
        }
      }
      dataAtualizada.email = email || null;
    }

    const cliente = await prisma.clientes.update({
      where: { id },
      data: dataAtualizada,
    });

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ message: 'Erro ao atualizar cliente' });
  }
}

export async function deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const clienteExistente = await prisma.clientes.findUnique({ where: { id } });
    if (!clienteExistente) {
      res.status(404).json({ message: 'Cliente não encontrado' });
      return;
    }

    await prisma.clientes.delete({ where: { id } });
    res.json({ message: 'Cliente deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cliente:', error);
    res.status(500).json({ message: 'Erro ao deletar cliente' });
  }
}
