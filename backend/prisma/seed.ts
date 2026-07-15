import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const saltRounds = 10;
  const senha = await bcrypt.hash('admin123', saltRounds);

  const admin = await prisma.usuario.upsert({
    where: { cpf: '00000000000' },
    update: {},
    create: {
      name: 'Administrador',
      cpf: '12738985246',
      email: 'admin@vagoneteiros.com',
      telefone: '(53) 99999-0000',
      senha,
      perfil: 'ADMIN',
    },
  });

  console.log(`✅ Admin criado: ${admin.name} (CPF: 127.389.852-46, senha: admin123)`);

  const redator = await prisma.usuario.upsert({
    where: { cpf: '11111111111' },
    update: {},
    create: {
      name: 'Redator Teste',
      cpf: '73229928733',
      email: 'redator@vagoneteiros.com',
      telefone: '(53) 99999-0001',
      senha: await bcrypt.hash('redator123', saltRounds),
      perfil: 'REDATOR',
    },
  });

  console.log(`✅ Redator criado: ${redator.name} (CPF: 732.299.287-33, senha: redator123)`);

  const usuario = await prisma.usuario.upsert({
    where: { cpf: '22222222222' },
    update: {},
    create: {
      name: 'Vagoneteiro Teste',
      cpf: '87912916407',
      email: 'vagoneteiro@vagoneteiros.com',
      telefone: '(53) 99999-0002',
      senha: await bcrypt.hash('vaga123', saltRounds),
      perfil: 'USUARIO',
    },
  });

  console.log(`✅ Usuário criado: ${usuario.name} (CPF: 879.129.164-07, senha: vaga123)`);

  // Criar um passeio de exemplo
  const passeio = await prisma.passeio.upsert({
    where: { id: 1 },
    update: {},
    create: {
      preco: 30.00,
      capacidade: 20,
      data: new Date('2026-07-10T09:00:00-03:00'),
      horario: "09:00",
      usuarioId: usuario.id,
    },
  });

  console.log(`✅ Passeio exemplo: ${passeio.id} - ${passeio.capacidade} vagas - R$ ${passeio.preco}`);

  console.log('🎉 Seed completo!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
