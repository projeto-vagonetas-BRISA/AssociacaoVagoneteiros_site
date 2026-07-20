import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── DADOS ───────────────────────────────────────────────────────────

const NOMES_VAGONETEIROS = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza',
  'Lucia Pereira', 'Roberto Lima', 'Fernanda Alves', 'Paulo Rodrigues', 'Juliana Martins',
  'Marcos Barbosa', 'Camila Rocha', 'Rafael Dias', 'Beatriz Carvalho', 'Lucas Gomes',
  'Amanda Ribeiro', 'Gabriel Teixeira', 'Larissa Araujo', 'Felipe Moreira', 'Vanessa Correia',
  'Thiago Cardoso', 'Priscila Monteiro', 'Eduardo Barros', 'Renata Freitas', 'Diego Nunes',
  'Carolina Castro', 'Bruno Peixoto', 'Tatiana Neves', 'Leonardo Vargas', 'Mariana Reis',
  'Guilherme Farias', 'Isabela Campos', 'André Menezes', 'Patrícia Duarte', 'Vinícius Lopes',
];

const SOBRENOMES_TURISTAS = [
  'Albuquerque', 'Vieira', 'Mendonça', 'Carneiro', 'Bandeira', 'Fontes', 'Aguiar',
  'Salgado', 'Cavalcanti', 'Cordeiro', 'Queiroz', 'Bastos', 'Pimentel', 'Guerra',
  'Vasconcelos', 'Lacerda', 'Maia', 'Siqueira', 'Goulart', 'Ferraz',
];

const NOMES_TURISTAS = [
  'Arthur', 'Heitor', 'Helena', 'Alice', 'Davi', 'Laura', 'Theo', 'Valentina',
  'Miguel', 'Sophia', 'Gael', 'Heloísa', 'Bernardo', 'Lívia', 'Noah', 'Manuela',
  'Gabriel', 'Isabela', 'Samuel', 'Luísa', 'Ravi', 'Esther', 'Enzo', 'Mariana',
  'Pedro', 'Emanuelly', 'Bento', 'Lorena', 'Henry', 'Júlia', 'Lorenzo', 'Sarah',
  'Isaac', 'Cecília', 'Benício', 'Giovanna', 'Joaquim', 'Elisa', 'Bryan', 'Rebecca',
  'Matteo', 'Lara', 'Dante', 'Antonella', 'Felipe', 'Carolina', 'Ryan', 'Lavínia',
  'Otávio', 'Gabriela',
];

const AGENCIAS = [
  'Turismo Sul', 'Viage+', 'Ecotur Brasil', 'Mar Aberto Turismo', 'Costa Sul Viagens',
  'Pampa Tur', 'Conexão Viagens', 'Rota Sul', 'Destino Cassino', 'Pacífico Tur',
  'Brisa Travel', 'Atlântico Viagens', 'Gaúcha Tur', 'Litoral Turismo', 'Viaje Bem',
];

const HORARIOS = [
  '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '15:00', '15:30',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCPF(): string {
  const n = () => randomInt(0, 9);
  return `${n()}${n()}${n()}.${n()}${n()}${n()}.${n()}${n()}${n()}-${n()}${n()}`;
}

function randomTelefone(): string {
  return `(53) 9${randomInt(8000, 9999)}-${randomInt(1000, 9999)}`;
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Povoando banco de dados...\n');

  // ─── 1. Limpar dados existentes ─────────────────────────────────
  console.log('🧹 Limpando dados antigos...');
  await prisma.avaliacao.deleteMany({});
  await prisma.agendamento.deleteMany({});
  await prisma.clientes.deleteMany({});
  await prisma.passeio.deleteMany({});
  await prisma.usuario.deleteMany({});
  console.log('✅ Dados limpos.\n');

  const saltRounds = 10;

  // ─── 2. Criar admin ─────────────────────────────────────────────
  console.log('👑 Criando admin...');
  const admin = await prisma.usuario.create({
    data: {
      name: 'Administrador',
      cpf: '12738985246',
      email: 'admin@vagoneteiros.com',
      telefone: '(53) 99999-0000',
      senha: await bcrypt.hash('admin123', saltRounds),
      perfil: 'ADMIN',
    },
  });
  console.log(`  ✅ ${admin.name}\n`);

  // ─── 3. Criar 35 vagoneteiros ──────────────────────────────────
  console.log('🚂 Criando 35 vagoneteiros...');
  const vagoneteiros: { id: number; name: string }[] = [];

  for (let i = 0; i < 35; i++) {
    const nome = NOMES_VAGONETEIROS[i];
    const cpfNum = 10000000000 + i;
    const vaga = await prisma.usuario.create({
      data: {
        name: nome,
        cpf: String(cpfNum).padStart(11, '0'),
        email: `vagoneteiro${i + 1}@vagoneteiros.com`,
        telefone: randomTelefone(),
        senha: await bcrypt.hash('vaga123', saltRounds),
        perfil: 'USUARIO',
        experiencia: `${randomInt(1, 20)} anos de experiência`,
      },
    });
    vagoneteiros.push({ id: vaga.id, name: vaga.name });
  }
  console.log(`  ✅ ${vagoneteiros.length} vagoneteiros criados.\n`);

  // ─── 4. Criar 500 clientes (turistas + agências) ────────────────
  console.log('👥 Criando 500 clientes...');
  const clientes: { id: number; nome: string }[] = [];
  const CPF_USADOS = new Set<string>();

  for (let i = 0; i < 500; i++) {
    let cpf: string;
    do {
      cpf = randomCPF();
    } while (CPF_USADOS.has(cpf));
    CPF_USADOS.add(cpf);

    let nome: string;
    let isAgencia = false;

    if (i < 480) {
      // Turista comum
      nome = `${randomChoice(NOMES_TURISTAS)} ${randomChoice(SOBRENOMES_TURISTAS)}`;
    } else {
      // Agência de turismo
      isAgencia = true;
      nome = randomChoice(AGENCIAS);
    }

    const email = isAgencia
      ? `contato${i}@${nome.toLowerCase().replace(/[^a-z]/g, '')}.com.br`
      : `turista${i}@email.com`;

    const cliente = await prisma.clientes.create({
      data: {
        nome,
        cpf,
        telefone: randomTelefone(),
        email,
      },
    });
    clientes.push({ id: cliente.id, nome: cliente.nome });
  }
  console.log(`  ✅ ${clientes.length} clientes criados.\n`);

  // ─── 5. Criar passeios: 20 por dia até 31/12/2026 ─────────────
  console.log('🗓️  Criando passeios (20/dia até 31/12/2026)...');
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fimAno = new Date(2026, 11, 31); // 31/12/2026
  const passeiosCriados: { id: number; data: Date; usuarioId: number }[] = [];

  let dataAtual = new Date(hoje);
  let totalPasseios = 0;

  while (dataAtual <= fimAno) {
    const diaSemana = dataAtual.getDay();
    // Pular domingos (menos passeios)
    const qtdHoje = diaSemana === 0 ? 10 : 20;

    for (let i = 0; i < qtdHoje && i < HORARIOS.length; i++) {
      // Escolher vagoneteiro aleatório
      const vaga = randomChoice(vagoneteiros);
      const preco = randomInt(15, 60);
      const capacidade = randomInt(10, 40);

      const passeio = await prisma.passeio.create({
        data: {
          preco,
          capacidade,
          data: new Date(dataAtual),
          horario: HORARIOS[i],
          usuarioId: vaga.id,
        },
      });
      passeiosCriados.push({ id: passeio.id, data: new Date(dataAtual), usuarioId: vaga.id });
      totalPasseios++;
    }

    // Avançar para o próximo dia
    dataAtual.setDate(dataAtual.getDate() + 1);
  }
  console.log(`  ✅ ${totalPasseios} passeios criados.\n`);

  // ─── 6. Preencher metade dos agendamentos com clientes ─────────
  console.log('📋 Criando agendamentos (metade dos passeios)...');
  const metade = Math.floor(passeiosCriados.length / 2);
  const passeiosParaAgendar = passeiosCriados.slice(0, metade);
  let totalAgendamentos = 0;

  for (const passeio of passeiosParaAgendar) {
    // Cada passeio recebe de 1 a 5 clientes
    const numClientes = randomInt(1, 5);
    const clientesSlot = [...clientes].sort(() => Math.random() - 0.5).slice(0, numClientes);

    for (const cliente of clientesSlot) {
      const acompanhantes = randomInt(0, 3);
      const statusOptions: string[] = ['CONFIRMADO', 'PENDENTE', 'CONFIRMADO', 'CONFIRMADO', 'CANCELADO'];
      const status = randomChoice(statusOptions);

      // Checar se já tem agendamento (evitar duplicata)
      const jaExiste = await prisma.agendamento.findFirst({
        where: { clienteId: cliente.id, passeioId: passeio.id },
      });
      if (jaExiste) continue;

      await prisma.agendamento.create({
        data: {
          clienteId: cliente.id,
          passeioId: passeio.id,
          acompanhantes,
          status: status as 'CONFIRMADO' | 'PENDENTE' | 'CANCELADO' | 'REMARCADO',
          promocao: Math.random() > 0.7,
          notificacao: Math.random() > 0.5,
          ciente: true,
        },
      });
      totalAgendamentos++;
    }
  }
  console.log(`  ✅ ${totalAgendamentos} agendamentos criados.\n`);

  // ─── RESUMO ─────────────────────────────────────────────────────
  const totalP = await prisma.passeio.count();
  const totalA = await prisma.agendamento.count();
  const totalC = await prisma.clientes.count();
  const totalV = await prisma.usuario.count({ where: { perfil: 'USUARIO' } });

  console.log('🎉 Povoamento completo!');
  console.log('══════════════════════════');
  console.log(`  👑 Admin:      1`);
  console.log(`  🚂 Vagoneteiros: ${totalV}`);
  console.log(`  🗓️  Passeios:    ${totalP}`);
  console.log(`  👥 Clientes:    ${totalC}`);
  console.log(`  📋 Agendamentos: ${totalA}`);
  console.log('══════════════════════════');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
