import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function enviarEmailResetSenha(destino: string, nome: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/redefinir-senha?token=${token}`;

  // Em desenvolvimento, logar o link no console caso SMTP falhe
  console.log(`[EMAIL RESET] Para: ${destino} | Link: ${link}`);

  try {
    await transporter.sendMail({
      from: `"Vagoneteiros" <${process.env.EMAIL_USER}>`,
      to: destino,
      subject: 'Redefinição de Senha — Vagoneteiros dos Molhes da Barra',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #0f172b; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Vagoneteiros dos Molhes da Barra</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
          <p style="color: #333; font-size: 15px;">Olá <strong>${nome}</strong>,</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Recebemos uma solicitação de redefinição de senha para sua conta.
            Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}"
               style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none;
                      padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: bold;">
              Redefinir Senha
            </a>
          </div>
          <p style="color: #888; font-size: 12px; line-height: 1.5;">
            Este link expira em <strong>1 hora</strong>.
            Se você não solicitou esta redefinição, ignore este email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #aaa; font-size: 11px;">
            Vagoneteiros dos Molhes da Barra — Desde 1932 levando turistas pelo maior molhe do mundo.
          </p>
        </div>
      </div>
    `,
    });
  } catch (err) {
    console.error('[EMAIL] Falha ao enviar email. Verifique EMAIL_USER/EMAIL_PASS no .env');
    console.error('[EMAIL] Erro:', (err as Error).message);
    // Não lança erro — o fluxo continua; o link foi logado no console
  }
}
