const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const NOTIFICATION_INTERVALS = [
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

function calculateNotificationTimes(data, horario) {
  const tz = process.env.APP_TIMEZONE || 'America/Sao_Paulo';
  const sourceDate = typeof data === 'string' ? new Date(data) : new Date(data);

  // For date-only values stored as UTC midnight, use the UTC Y/M/D as the intended
  // calendar date to avoid shifting the day when formatting into the target timezone.
  const year = sourceDate.getUTCFullYear();
  const month = sourceDate.getUTCMonth() + 1;
  const day = sourceDate.getUTCDate();
  const [hh, mm] = horario.split(':').map(Number);

  function tzLocalToUtcMs(year, month, day, hh, mm, tz) {
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

  const passeioUtcMs = tzLocalToUtcMs(year, month, day, hh || 0, mm || 0, tz);
  return {
    passeioUtcMs,
    times: NOTIFICATION_INTERVALS.map(({ tipo, offsetMs }) => ({ tipo, enviarEm: new Date(passeioUtcMs - offsetMs) })),
  };
}

async function main() {
  const id = Number(process.argv[2] || '20');
  const passeio = await prisma.passeio.findUnique({ where: { id } });
  if (!passeio) {
    console.error('Passeio not found', id);
    process.exit(1);
  }
  console.log('Passeio data (db):', passeio.data.toISOString(), 'horario:', passeio.horario);
  const result = calculateNotificationTimes(passeio.data, passeio.horario);
  const times = result.times;
  console.log('Computed passeioUtcMs:', new Date(result.passeioUtcMs).toISOString());
  const now = new Date();
  console.log('Now:', now.toISOString());
  for (const t of times) {
    console.log(t.tipo, t.enviarEm.toISOString(), 'isFuture=', t.enviarEm > now);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
