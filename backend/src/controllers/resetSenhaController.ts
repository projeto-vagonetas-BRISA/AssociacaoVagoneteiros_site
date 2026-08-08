import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { enviarEmailResetSenha } from '../utils/email';
import { Perfil, ResetTokenStatus } from '@prisma/client';

const RESET_LINK_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutos

function getGenericResponse(res: Response): void {
  res.json({ message: 'Se este e-mail estiver cadastrado, você receberá um retorno em breve.' });
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function esqueciSenha(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Informe seu e-mail cadastrado.' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return getGenericResponse(res);
    }

    await prisma.resetToken.updateMany({
      where: { email, usado: false, status: { not: ResetTokenStatus.REJECTED } },
      data: { usado: true, status: ResetTokenStatus.REJECTED },
    });

    if (usuario.perfil === Perfil.VAGONETEIRO) {
      const token = generateResetToken();
      const expiraEm = new Date(Date.now() + RESET_LINK_EXPIRATION_MS);

      await prisma.resetToken.create({
        data: {
          email,
          usuarioId: usuario.id,
          perfil: usuario.perfil,
          status: ResetTokenStatus.APPROVED,
          token,
          expiraEm,
        },
      });

      await enviarEmailResetSenha(email, usuario.name, token);
      return getGenericResponse(res);
    }

    await prisma.resetToken.create({
      data: {
        email,
        usuarioId: usuario.id,
        perfil: usuario.perfil,
        status: ResetTokenStatus.PENDING_APPROVAL,
      },
    });

    return getGenericResponse(res);
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação. Tente novamente mais tarde.' });
  }
}

export async function listarSolicitacoesReset(req: Request, res: Response): Promise<void> {
  try {
    const solicitacoes = await prisma.resetToken.findMany({
      where: { status: ResetTokenStatus.PENDING_APPROVAL },
      orderBy: { criadoEm: 'asc' },
      select: {
        id: true,
        email: true,
        perfil: true,
        criadoEm: true,
        usuario: { select: { id: true, name: true } },
      },
    });

    res.json({ solicitacoes });
  } catch (error) {
    console.error('Erro ao listar solicitações de reset:', error);
    res.status(500).json({ message: 'Erro ao listar solicitações.' });
  }
}

export async function aprovarSolicitacaoReset(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const solicitacao = await prisma.resetToken.findUnique({ where: { id } });
    if (!solicitacao || solicitacao.status !== ResetTokenStatus.PENDING_APPROVAL || solicitacao.usado) {
      res.status(404).json({ message: 'Solicitação não encontrada ou já processada.' });
      return;
    }

    const token = generateResetToken();
    const expiraEm = new Date(Date.now() + RESET_LINK_EXPIRATION_MS);

    const atualizado = await prisma.resetToken.update({
      where: { id },
      data: {
        status: ResetTokenStatus.APPROVED,
        token,
        expiraEm,
        aprovadoPorId: (req as any).user?.id,
        aprovadoEm: new Date(),
      },
      include: { usuario: true },
    });

    if (atualizado.usuario?.email) {
      await enviarEmailResetSenha(atualizado.usuario.email, atualizado.usuario.name, token);
    }

    res.json({ message: 'Solicitação aprovada e link enviado ao usuário.' });
  } catch (error) {
    console.error('Erro ao aprovar solicitação de reset:', error);
    res.status(500).json({ message: 'Erro ao aprovar solicitação.' });
  }
}

export async function rejeitarSolicitacaoReset(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ message: 'ID inválido.' });
      return;
    }

    const solicitacao = await prisma.resetToken.findUnique({ where: { id } });
    if (!solicitacao || solicitacao.status !== ResetTokenStatus.PENDING_APPROVAL || solicitacao.usado) {
      res.status(404).json({ message: 'Solicitação não encontrada ou já processada.' });
      return;
    }

    await prisma.resetToken.update({
      where: { id },
      data: {
        status: ResetTokenStatus.REJECTED,
        usado: true,
        aprovadoPorId: (req as any).user?.id,
        aprovadoEm: new Date(),
      },
    });

    res.json({ message: 'Solicitação rejeitada.' });
  } catch (error) {
    console.error('Erro ao rejeitar solicitação de reset:', error);
    res.status(500).json({ message: 'Erro ao rejeitar solicitação.' });
  }
}

export async function redefinirSenha(req: Request, res: Response): Promise<void> {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
      return;
    }

    if (novaSenha.length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    const resetToken = await prisma.resetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.usado || resetToken.status !== ResetTokenStatus.APPROVED || !resetToken.expiraEm) {
      res.status(400).json({ message: 'Token inválido ou já utilizado.' });
      return;
    }

    if (new Date() > resetToken.expiraEm) {
      res.status(400).json({ message: 'Token expirado. Solicite uma nova redefinição.' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: resetToken.email } });
    if (!usuario) {
      res.status(400).json({ message: 'Usuário não encontrado.' });
      return;
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: senhaHash,
        tokenVersion: usuario.tokenVersion + 1,
      },
    });

    await prisma.resetToken.update({
      where: { id: resetToken.id },
      data: {
        usado: true,
        status: ResetTokenStatus.COMPLETED,
      },
    });

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha. Tente novamente.' });
  }
}
