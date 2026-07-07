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
      cpf: '00000000000',
      email: 'admin@vagoneteiros.com',
      telefone: '(53) 99999-0000',
      senha,
      perfil: 'ADMIN',
    },
  });

  console.log(`✅ Admin criado: ${admin.name} (CPF: 000.000.000-00, senha: admin123)`);

  const redator = await prisma.usuario.upsert({
    where: { cpf: '11111111111' },
    update: {},
    create: {
      name: 'Redator Teste',
      cpf: '11111111111',
      email: 'redator@vagoneteiros.com',
      telefone: '(53) 99999-0001',
      senha: await bcrypt.hash('redator123', saltRounds),
      perfil: 'REDATOR',
    },
  });

  console.log(`✅ Redator criado: ${redator.name} (CPF: 111.111.111-11, senha: redator123)`);

  const usuario = await prisma.usuario.upsert({
    where: { cpf: '22222222222' },
    update: {},
    create: {
      name: 'Vagoneteiro Teste',
      cpf: '22222222222',
      email: 'vagoneteiro@vagoneteiros.com',
      telefone: '(53) 99999-0002',
      senha: await bcrypt.hash('vaga123', saltRounds),
      perfil: 'USUARIO',
    },
  });

  console.log(`✅ Usuário criado: ${usuario.name} (CPF: 222.222.222-22, senha: vaga123)`);

  // Criar um passeio de exemplo
  const passeio = await prisma.passeio.upsert({
    where: { id: 1 },
    update: {},
    create: {
      valor: 30.00,
      capacidade: 20,
      data: new Date('2026-07-10T09:00:00-03:00'),
      usuarioId: usuario.id,
    },
  });

  console.log(`✅ Passeio exemplo: ${passeio.id} - ${passeio.capacidade} vagas - R$ ${passeio.valor}`);

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
