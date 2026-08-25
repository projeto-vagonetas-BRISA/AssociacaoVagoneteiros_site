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
  // Prefer using the exact UTC instant stored in the database (`data`) when available.
  // Most `Passeio.data` rows already contain the correct UTC timestamp that corresponds
  // to the local wall-clock `horario`. Using that instant avoids timezone-conversion
  // pitfalls for near-term bookings.
  const sourceDate = typeof data === 'string' ? new Date(data) : new Date(data);

  let passeioUtcMs: number;
  if (sourceDate.getUTCHours() !== 0 || sourceDate.getUTCMinutes() !== 0 || sourceDate.getUTCSeconds() !== 0) {
    // `data` already includes time information in UTC; use it directly.
    passeioUtcMs = sourceDate.getTime();
  } else {
    // Fallback: if `data` is date-only (00:00), build UTC from the local calendar date
    // and `horario` using the configured timezone. Use an iterative correction to
    // compute the exact UTC instant for the given local wall-clock time in `tz`.
    const tz = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
    // When `data` is date-only (stored as UTC midnight), avoid interpreting it
    // via `Intl` (which may shift the calendar day for negative offsets). Instead
    // treat the stored UTC date components as the intended calendar date, and
    // compute the correct UTC instant for that local wall-clock time.
    const year = sourceDate.getUTCFullYear();
    const month = sourceDate.getUTCMonth() + 1;
    const day = sourceDate.getUTCDate();
    const [hh, mm] = horario.split(':').map(Number);

    function tzLocalToUtcMs(year: number, month: number, day: number, hh: number, mm: number, tz: string) {
      const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

      // initial guess: interpret the local fields as UTC
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

        // Adjust guess by the delta (in minutes). Subtract because if formatted is ahead,
        // we need an earlier UTC instant.
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
