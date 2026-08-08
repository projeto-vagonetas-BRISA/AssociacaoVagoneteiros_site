import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const saltRounds = 10;
  const senha = await bcrypt.hash('admin123', saltRounds);

  // Remover dados antigos antes de recriar
  await prisma.slotAtribuicao.deleteMany({});
  await prisma.slotInstancia.deleteMany({});
  await prisma.slotPasseio.deleteMany({});
  await prisma.notificacaoAgendamento.deleteMany({});
  await prisma.agendamento.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.passeio.deleteMany({});
  await prisma.avaliacao.deleteMany({});
  await prisma.clientes.deleteMany({});
  await prisma.resetToken.deleteMany({});
  await prisma.usuario.deleteMany({
    where: { email: { in: ['admin@vagoneteiros.com', 'redator@vagoneteiros.com', 'vagoneteiro@vagoneteiros.com'] } },
  });

  const admin = await prisma.usuario.upsert({
    where: { cpf: '12738985246' },
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
    where: { cpf: '73229928733' },
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
    where: { cpf: '87912916407' },
    update: {},
    create: {
      name: 'Vagoneteiro Teste',
      cpf: '87912916407',
      email: 'vagoneteiro@vagoneteiros.com',
      telefone: '(53) 99999-0002',
      senha: await bcrypt.hash('vaga123', saltRounds),
      perfil: 'VAGONETEIRO',
    },
  });

  console.log(`✅ Usuário criado: ${usuario.name} (CPF: 879.129.164-07, senha: vaga123)`);

  // Criar um passeio de exemplo (com data futura)
  const dataFutura = new Date();
  dataFutura.setDate(dataFutura.getDate() + 7);
  dataFutura.setHours(9, 0, 0, 0);

  const passeio = await prisma.passeio.upsert({
    where: { id: 1 },
    update: { data: dataFutura },
    create: {
      preco: 30.00,
      capacidade: 20,
      data: dataFutura,
      horario: "09:00",
      usuarioId: usuario.id,
    },
  });

  console.log(`✅ Passeio exemplo: ${passeio.id} - ${passeio.capacidade} vagas - R$ ${passeio.preco} (${dataFutura.toLocaleDateString('pt-BR')})`);

  // Criar SlotPasseio + SlotInstancia + SlotAtribuicao para o vagoneteiro de teste
  // (necessário para que apareça em "Minhas Atribuições")
  const slotExistente = await prisma.slotPasseio.findFirst({
    where: { titulo: 'Passeio Molhes - Turno Manhã (Seed)' },
  });

  const slot = slotExistente ?? await prisma.slotPasseio.create({
    data: {
      tipo: 'INDIVIDUAL',
      titulo: 'Passeio Molhes - Turno Manhã (Seed)',
      descricao: 'Passeio de exemplo criado pelo seed',
      horaInicio: '09:00',
      horaFim: '10:30',
      duracaoMinutos: 90,
      capacidade: 20,
      valor: 30.00,
      usuarioId: usuario.id,
      status: 'DISPONIVEL',
    },
  });

  console.log(`✅ SlotPasseio: ${slot.id} - ${slot.titulo}`);

  // Data da instância: mesma do passeio (7 dias no futuro)
  const dataInstancia = new Date(dataFutura);
  dataInstancia.setHours(0, 0, 0, 0);

  const instanciaExistente = await prisma.slotInstancia.findFirst({
    where: { slotPasseioId: slot.id, data: dataInstancia, horaInicio: '09:00' },
  });

  const instancia = instanciaExistente ?? await prisma.slotInstancia.create({
    data: {
      slotPasseioId: slot.id,
      data: dataInstancia,
      horaInicio: '09:00',
      horaFim: '10:30',
      status: 'AGENDADO',
    },
  });

  console.log(`✅ SlotInstancia: ${instancia.id} - ${dataInstancia.toLocaleDateString('pt-BR')}`);

  const atribuicaoExistente = await prisma.slotAtribuicao.findFirst({
    where: { slotPasseioId: slot.id, instanciaId: instancia.id, vagoneteiroId: usuario.id },
  });

  if (!atribuicaoExistente) {
    await prisma.slotAtribuicao.create({
      data: {
        slotPasseioId: slot.id,
        instanciaId: instancia.id,
        vagoneteiroId: usuario.id,
        status: 'ATRIBUIDO',
      },
    });
    console.log(`✅ SlotAtribuicao criada para ${usuario.name}`);
  } else {
    console.log(`ℹ️  SlotAtribuicao já existe para ${usuario.name}`);
  }

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
