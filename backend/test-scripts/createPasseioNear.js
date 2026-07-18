const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hours = Number(process.argv[2] || '3');
  const data = new Date(Date.now() + hours * 60 * 60 * 1000);
  // keep minutes rounded to next minute
  data.setSeconds(0, 0);

  const passeio = await prisma.passeio.create({
    data: {
      usuarioId: 3,
      preco: 10,
      capacidade: 10,
      data,
      horario: `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`,
      ativo: true,
    },
  });
  console.log('Created passeio id=', passeio.id, 'data=', passeio.data.toISOString(), 'horario=', passeio.horario);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
