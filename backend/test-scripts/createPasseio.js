const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = new Date();
  data.setDate(data.getDate() + 7); // one week from now
  data.setHours(12, 0, 0, 0);

  const passeio = await prisma.passeio.create({
    data: {
      usuarioId: 3,
      preco: 20,
      capacidade: 10,
      data,
      horario: '12:00',
      ativo: true,
    },
  });
  console.log('Created passeio id=', passeio.id, 'date=', passeio.data.toISOString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
