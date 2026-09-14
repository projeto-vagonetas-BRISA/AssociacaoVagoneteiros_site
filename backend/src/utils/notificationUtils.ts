export type TipoNotificacaoAgendamento =
  | 'ONE_WEEK'
  | 'THREE_DAYS'
  | 'ONE_DAY'
  | 'TWELVE_HOURS'
  | 'SIX_HOURS'
  | 'THREE_HOURS'
  | 'ONE_HOUR'
  | 'THIRTY_MINUTES'
  | 'TEN_MINUTES';

export const NOTIFICATION_INTERVALS: { tipo: TipoNotificacaoAgendamento; offsetMs: number }[] = [
  { tipo: 'ONE_WEEK', offsetMs: 1000 * 60 * 60 * 24 * 7 },
  { tipo: 'THREE_DAYS', offsetMs: 1000 * 60 * 60 * 24 * 3 },
  { tipo: 'ONE_DAY', offsetMs: 1000 * 60 * 60 * 24 },
  { tipo: 'TWELVE_HOURS', offsetMs: 1000 * 60 * 60 * 12 },
  { tipo: 'SIX_HOURS', offsetMs: 1000 * 60 * 60 * 6 },
  { tipo: 'THREE_HOURS', offsetMs: 1000 * 60 * 60 * 3 },
  { tipo: 'ONE_HOUR', offsetMs: 1000 * 60 * 60 },
  { tipo: 'THIRTY_MINUTES', offsetMs: 1000 * 60 * 30 },
  { tipo: 'TEN_MINUTES', offsetMs: 1000 * 60 * 10 },
];

export function calculateNotificationTimes(data: string | Date, horario: string) {

  const sourceDate = typeof data === 'string' ? new Date(data) : new Date(data);

  let passeioUtcMs: number;
  if (sourceDate.getUTCHours() !== 0 || sourceDate.getUTCMinutes() !== 0 || sourceDate.getUTCSeconds() !== 0) {
    passeioUtcMs = sourceDate.getTime();
  } else {
    const tz = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
    const year = sourceDate.getUTCFullYear();
    const month = sourceDate.getUTCMonth() + 1;
    const day = sourceDate.getUTCDate();
    const [hh, mm] = horario.split(':').map(Number);

    function tzLocalToUtcMs(year: number, month: number, day: number, hh: number, mm: number, tz: string) {
      const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

      let guess = Date.UTC(year, month - 1, day, hh || 0, mm || 0, 0, 0);

      for (let i = 0; i < 10; i++) {
        const formatted = dtf.formatToParts(new Date(guess));
        const fy = Number(formatted.find((p) => p.type === 'year')?.value);
        const fm = Number(formatted.find((p) => p.type === 'month')?.value);
        const fd = Number(formatted.find((p) => p.type === 'day')?.value);
        const fh = Number(formatted.find((p) => p.type === 'hour')?.value);
        const fmin = Number(formatted.find((p) => p.type === 'minute')?.value);

        if (fy === year && fm === month && fd === day && fh === (hh || 0) && fmin === (mm || 0)) {
          return guess;
        }

        const formattedTotalMin = fh * 60 + fmin + (fd - day) * 24 * 60;
        const desiredTotalMin = (hh || 0) * 60 + (mm || 0);
        const deltaMin = formattedTotalMin - desiredTotalMin;

        guess -= deltaMin * 60 * 1000;
      }

      return guess;
    }

    passeioUtcMs = tzLocalToUtcMs(year, month, day, hh || 0, mm || 0, tz);
  }

  return NOTIFICATION_INTERVALS.map(({ tipo, offsetMs }) => ({
    tipo,
    enviarEm: new Date(passeioUtcMs - offsetMs),
  }));
}
