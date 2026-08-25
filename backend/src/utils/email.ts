import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('[EMAIL] EMAIL_USER/EMAIL_PASS não configurados no .env');
    return null;
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

transporter = getTransporter();

function sendMail(
  destino: string,
  assunto: string,
  html: string,
): void {
  if (!transporter || !process.env.EMAIL_USER) {
    console.log(`[EMAIL] SMTP não configurado. Para: ${destino} | Assunto: ${assunto}`);
    return;
  }
  transporter.sendMail({
    from: `"Vagoneteiros" <${process.env.EMAIL_USER}>`,
    to: destino,
    subject: assunto,
    html,
  }).then((r: nodemailer.SentMessageInfo) => {
    console.log(`[EMAIL] Enviado para ${destino} | ID: ${r.messageId}`);
  }).catch((err: Error) => {
    console.error(`[EMAIL] Falha ao enviar para ${destino}:`, err.message);
  });
}

function wrapHtml(bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #0f172b; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">Vagoneteiros dos Molhes da Barra</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 12px 12px;">
        ${bodyHtml}
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #aaa; font-size: 11px;">
          Vagoneteiros dos Molhes da Barra — Desde 1932 levando turistas pelo maior molhe do mundo.
        </p>
      </div>
    </div>
  `;
}

export async function enviarEmailResetSenha(destino: string, nome: string, token: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/redefinir-senha?token=${token}`;

  console.log(`[EMAIL RESET] Para: ${destino} | Link: ${link}`);

  sendMail(destino,
    'Redefinição de Senha — Vagoneteiros dos Molhes da Barra',
    wrapHtml(`
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
        Este link expira em <strong>15 minutos</strong>.
        Se você não solicitou esta redefinição, ignore este email.
      </p>
    `),
  );
}

export async function enviarEmailConfirmacaoAgendamento(
  destino: string,
  nome: string,
  codigo: number,
  data: string,
  horario: string,
  passeio: string,
): Promise<void> {
  const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  console.log(`[EMAIL AGENDAMENTO] Para: ${destino} | Código: #${codigo}`);

  sendMail(destino,
    `Confirmação de Agendamento #${codigo} — Vagoneteiros dos Molhes da Barra`,
    wrapHtml(`
      <p style="color: #333; font-size: 15px;">Olá <strong>${nome}</strong>,</p>
      <p style="color: #555; font-size: 14px; line-height: 1.6;">
        Seu passeio foi agendado com sucesso!
      </p>
      <div style="background: #f8f9ff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 12px 0; color: #333; font-size: 14px;">
          <strong>Código do Agendamento:</strong>
          <span style="color: #2563eb; font-size: 18px; font-weight: bold; margin-left: 8px;">#${codigo}</span>
        </p>
        <p style="margin: 0 0 8px 0; color: #555; font-size: 14px;">
          <strong>Passeio:</strong> ${passeio}
        </p>
        <p style="margin: 0 0 8px 0; color: #555; font-size: 14px;">
          <strong>Data:</strong> ${dataFormatada}
        </p>
        <p style="margin: 0; color: #555; font-size: 14px;">
          <strong>Horário:</strong> ${horario}
        </p>
      </div>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        Se você autorizou as notificações, poderá ser lembrado pelos vagoneteiros próximo ao horário do passeio. 🚂
      </p>
      <p style="color: #888; font-size: 12px; line-height: 1.5;">
        Apresente este código no dia do passeio para confirmar sua reserva.
      </p>
    `),
  );
}
