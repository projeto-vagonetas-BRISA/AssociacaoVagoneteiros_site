import prisma from '../lib/prisma';
import { messaging } from '../utils/firebaseAdmin';

function maskToken(token?: string | null) {
  if (!token) return 'none';
  if (token.length <= 12) return token;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
}

function logTokenFailure(subscription: { id: number; token?: string | null } | null | undefined, error: unknown, context: string) {
  const tokenPreview = maskToken(subscription?.token);
  console.warn(`[FCM] ${context} subscriptionId=${subscription?.id ?? 'unknown'} token=${tokenPreview}`, error);
}

function isNotRegisteredError(error: unknown) {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? (error as { code?: string }).code : undefined;
  const message = 'message' in error ? (error as { message?: string }).message : undefined;
  
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    message === 'NotRegistered' ||
    (typeof message === 'string' && (
      message.includes('registration token is not a valid') ||
      message.includes('Requested entity was not found')
    ))
  );
}

const INTERVALOS = [
  'ONE_WEEK',
  'THREE_DAYS',
  'ONE_DAY',
  'TWELVE_HOURS',
  'SIX_HOURS',
  'THREE_HOURS',
  'ONE_HOUR',
  'THIRTY_MINUTES',
  'TEN_MINUTES',
] as const;

type Intervalo = (typeof INTERVALOS)[number];

const OFFSET_MS: Record<Intervalo, number> = {
  ONE_WEEK: 1000 * 60 * 60 * 24 * 7,
  THREE_DAYS: 1000 * 60 * 60 * 24 * 3,
  ONE_DAY: 1000 * 60 * 60 * 24,
  TWELVE_HOURS: 1000 * 60 * 60 * 12,
  SIX_HOURS: 1000 * 60 * 60 * 6,
  THREE_HOURS: 1000 * 60 * 60 * 3,
  ONE_HOUR: 1000 * 60 * 60,
  THIRTY_MINUTES: 1000 * 60 * 30,
  TEN_MINUTES: 1000 * 60 * 10,
};

const WINDOW_MS = 1000 * 60 * 15; // 15-minute grace window to catch due or slightly-late reminders

function getPasseioDate(passeio: { data: string | Date; horario: string }): Date {
  const d = typeof passeio.data === 'string' ? new Date(passeio.data) : new Date(passeio.data);
  const [hh, mm] = passeio.horario.split(':').map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

function buildMessage(title: string, body: string) {
  return {
    notification: { title, body },
    webpush: {
      headers: {
        Urgency: 'high',
      },
      fcm_options: {
        link: process.env.FRONTEND_URL || 'http://localhost:5173',
      },
    },
  };
}

function getMessageForType(tipo: Intervalo, passeioDate: Date) {
  const dataFormatada = passeioDate.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });

  switch (tipo) {
    case 'ONE_WEEK':
      return buildMessage('Lembrete de passeio', `Seu passeio está agendado para ${dataFormatada}. Falta 1 semana.`);
    case 'THREE_DAYS':
      return buildMessage('Lembrete de passeio', `Seu passeio está agendado para ${dataFormatada}. Falta 3 dias.`);
    case 'ONE_DAY':
      return buildMessage('Lembrete de passeio', `Seu passeio é amanhã em ${dataFormatada}.`);
    case 'TWELVE_HOURS':
      return buildMessage('Lembrete de passeio', `Seu passeio ocorrerá em torno de 12 horas (${dataFormatada}).`);
    case 'SIX_HOURS':
      return buildMessage('Lembrete de passeio', `Seu passeio ocorrerá em torno de 6 horas (${dataFormatada}).`);
    case 'THREE_HOURS':
      return buildMessage('Lembrete de passeio', `Seu passeio ocorrerá em torno de 3 horas (${dataFormatada}).`);
    case 'ONE_HOUR':
      return buildMessage('Lembrete de passeio', `Seu passeio ocorrerá em torno de 1 hora (${dataFormatada}).`);
    case 'THIRTY_MINUTES':
      return buildMessage('Lembrete de passeio', `Seu passeio ocorrerá em torno de 30 minutos (${dataFormatada}).`);
    case 'TEN_MINUTES':
      return buildMessage('Lembrete de passeio', `Seu passeio ocorrerá em torno de 10 minutos (${dataFormatada}).`);
    default:
      return buildMessage('Lembrete de passeio', `Seu passeio está próximo: ${dataFormatada}.`);
  }
}

export async function processarNotificacoesAgendamento() {
  if (!messaging) {
    console.warn('Firebase Messaging não está inicializado. Nenhuma notificação será enviada.');
    return;
  }

  const now = new Date();

  const notificacoes = await prisma.notificacaoAgendamento.findMany({
    where: {
      agendamento: {
        status: { not: 'CANCELADO' },
        notificacao: true,
        passeio: { ativo: true },
      },
      pushSubscription: {
        token: { not: '' },
      },
      enviarEm: {
        gte: new Date(now.getTime() - WINDOW_MS),
        lte: now,
      },
    },
    include: {
      agendamento: {
        include: {
          passeio: true,
          cliente: true,
        },
      },
      pushSubscription: true,
    },
    orderBy: { enviarEm: 'asc' },
  });

  if (!notificacoes.length) return;

  for (const notificacao of notificacoes) {
    const subscription = notificacao.pushSubscription;
    if (!subscription?.token) continue;

    const passeioDate = getPasseioDate(notificacao.agendamento.passeio);
    const payload = getMessageForType(notificacao.tipo as Intervalo, passeioDate);

    try {
      console.log(`[FCM] Attempting to send notification ID=${notificacao.id} of type=${notificacao.tipo} to client ID=${notificacao.agendamento.clienteId} with token=${maskToken(subscription.token)}`);
      
      const response = await messaging.send({
        token: subscription.token,
        ...payload,
      });
      
      console.log(`[FCM] Notification ID=${notificacao.id} sent successfully. Message ID from Firebase: ${response}`);
      
      // remove the notification row after successful delivery to simplify state
      await prisma.notificacaoAgendamento.delete({ where: { id: notificacao.id } });
      console.log(`[FCM] Deleted notification ID=${notificacao.id} from database after successful delivery.`);
    } catch (error) {
      console.error(`[FCM] Error sending notification ID=${notificacao.id}:`, error);
      if (isNotRegisteredError(error)) {
        logTokenFailure(subscription, error, 'token failed with NotRegistered; removing stale subscription');
        await prisma.notificacaoAgendamento.deleteMany({
          where: { pushSubscriptionId: subscription.id },
        });
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      } else {
        logTokenFailure(subscription, error, 'token send failed');
      }
    }
  }
}

export function iniciarAgendamentoScheduler() {
  if (process.env.NODE_ENV === 'test') return;

  // Align execution to the system clock minute boundary.
  // This schedules the job to run exactly at the start of each minute,
  // independent of when the process started.
  const runOnce = async () => {
    try {
      await processarNotificacoesAgendamento();
    } catch (error) {
      console.error('Erro no scheduler de notificações:', error);
    }
  };

  const scheduleNext = () => {
    const now = Date.now();
    const delay = 60000 - (now % 60000); // ms until next minute boundary
    setTimeout(async () => {
      await runOnce();
      scheduleNext();
    }, delay);
  };

  // kick off aligned scheduling
  scheduleNext();
}
