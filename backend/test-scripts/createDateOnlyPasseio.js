const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = tomorrow.getMonth();
  const day = tomorrow.getDate();
  const dataUtcMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0));

  const passeio = await prisma.passeio.create({
    data: {
      usuarioId: 3,
      preco: 15,
      capacidade: 10,
      data: dataUtcMidnight,
      horario: '09:00',
      ativo: true,
    },
  });
  console.log('Created date-only passeio id=', passeio.id, 'data=', passeio.data.toISOString(), 'horario=', passeio.horario);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
