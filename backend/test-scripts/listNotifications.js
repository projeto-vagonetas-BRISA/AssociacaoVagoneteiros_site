const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.pushSubscription.findMany({ include: { notificacoes: true } });
  console.log('PushSubscriptions:', JSON.stringify(subs, null, 2));

  const nots = await prisma.notificacaoAgendamento.findMany({ include: { pushSubscription: true, agendamento: true } });
  console.log('Notificacoes:', JSON.stringify(nots, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
