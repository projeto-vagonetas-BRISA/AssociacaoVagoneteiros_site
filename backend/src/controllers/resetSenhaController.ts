import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { enviarEmailResetSenha } from '../utils/email';

export async function esqueciSenha(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: 'Informe seu e-mail cadastrado.' });
      return;
    }

    // Buscar usuário pelo email
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      // Não revelar se o email existe ou não por segurança
      res.json({ message: 'Se este e-mail estiver cadastrado, você receberá um link de redefinição.' });
      return;
    }

    // Invalidar tokens anteriores do mesmo email
    await prisma.resetToken.updateMany({
      where: { email, usado: false },
      data: { usado: true },
    });

    // Gerar token aleatório
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.resetToken.create({
      data: { email, token, expiraEm },
    });

    // Enviar email
    await enviarEmailResetSenha(email, usuario.name, token);

    res.json({ message: 'Se este e-mail estiver cadastrado, você receberá um link de redefinição.' });
  } catch (error) {
    console.error('Erro ao solicitar redefinição de senha:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação. Tente novamente mais tarde.' });
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

    // Buscar token válido
    const resetToken = await prisma.resetToken.findUnique({ where: { token } });

    if (!resetToken || resetToken.usado) {
      res.status(400).json({ message: 'Token inválido ou já utilizado.' });
      return;
    }

    if (new Date() > resetToken.expiraEm) {
      res.status(400).json({ message: 'Token expirado. Solicite uma nova redefinição.' });
      return;
    }

    // Buscar usuário pelo email do token
    const usuario = await prisma.usuario.findUnique({ where: { email: resetToken.email } });

    if (!usuario) {
      res.status(400).json({ message: 'Usuário não encontrado.' });
      return;
    }

    // Atualizar senha
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: senhaHash },
    });

    // Marcar token como usado
    await prisma.resetToken.update({
      where: { id: resetToken.id },
      data: { usado: true },
    });

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha. Tente novamente.' });
  }
}
