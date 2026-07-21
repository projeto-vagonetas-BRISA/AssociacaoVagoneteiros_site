// Caminho Feliz — Teste End-to-End
// Cria um slot, 5 agendamentos, atribui um vagoneteiro e conclui
//
// Uso: node backend/test-scripts/caminho-feliz.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('');
  console.log('🧪 Iniciando teste — Caminho Feliz');
  console.log('');

  // ─── 1. USUÁRIOS ───────────────────────────────────────────────

  const vagoneteiro = await prisma.usuario.findFirst({
    where: { perfil: 'VAGONETEIRO' },
  });
  if (!vagoneteiro) throw new Error('Nenhum vagoneteiro encontrado');

  const admin = await prisma.usuario.findFirst({
    where: { perfil: 'ADMIN' },
  });
  if (!admin) throw new Error('Nenhum admin encontrado');

  console.log(`👤 Admin: ${admin.name} (id=${admin.id})`);
  console.log(`👤 Vagoneteiro: ${vagoneteiro.name} (id=${vagoneteiro.id})`);

  // ─── 2. SLOT ───────────────────────────────────────────────────

  const dataFutura = new Date();
  dataFutura.setDate(dataFutura.getDate() + 7);

  const slot = await prisma.slotPasseio.create({
    data: {
      tipo: 'FIXO',
      titulo: 'Passeio Teste Caminho Feliz',
      descricao: 'Slot criado pelo teste automático',
      horaInicio: '08:00',
      horaFim: '09:00',
      duracaoMinutos: 60,
      diaSemana: 'SEGUNDA',
      dataInicio: dataFutura,
      capacidade: 10,
      valor: 30,
      usuarioId: vagoneteiro.id,
      status: 'DISPONIVEL',
    },
  });
  console.log(`📦 Slot criado: id=${slot.id} — "${slot.titulo}"`);

  const instancia = await prisma.slotInstancia.create({
    data: {
      slotPasseioId: slot.id,
      data: dataFutura,
      horaInicio: '08:00',
      horaFim: '09:00',
      status: 'AGENDADO',
    },
  });
  console.log(`📅 Instância criada: id=${instancia.id}`);

  // ─── 3. PASSEIO + 5 AGENDAMENTOS ──────────────────────────────

  const passeio = await prisma.passeio.create({
    data: {
      usuarioId: vagoneteiro.id,
      preco: 30,
      capacidade: 10,
      data: dataFutura,
      horario: '08:00',
      ativo: true,
    },
  });
  console.log(`🚂 Passeio criado: id=${passeio.id}`);

  const clientes = await prisma.clientes.findMany({ take: 5 });
  if (clientes.length < 5) throw new Error('Precisa de pelo menos 5 clientes');

  const agendamentos = [];
  for (let i = 0; i < 5; i++) {
    const ag = await prisma.agendamento.create({
      data: {
        clienteId: clientes[i].id,
        passeioId: passeio.id,
        status: 'CONFIRMADO',
        acompanhantes: 0,
        notificacao: false,
        promocao: false,
        ciente: true,
      },
    });
    agendamentos.push(ag);
    console.log(`📋 Agendamento #${i + 1}: id=${ag.id} — ${clientes[i].nome}`);
  }
  console.log(`✅ ${agendamentos.length} agendamentos criados`);

  // ─── 4. ATRIBUIÇÃO DE VAGONETEIRO ─────────────────────────────

  const atribuicao = await prisma.slotAtribuicao.create({
    data: {
      slotPasseioId: slot.id,
      instanciaId: instancia.id,
      vagoneteiroId: vagoneteiro.id,
      status: 'ATRIBUIDO',
    },
  });
  console.log(`🎯 Atribuição: id=${atribuicao.id} — ${vagoneteiro.name}`);

  // ─── 5. CONCLUIR ──────────────────────────────────────────────

  await prisma.slotPasseio.update({
    where: { id: slot.id },
    data: { status: 'REALIZADO' },
  });
  await prisma.slotInstancia.update({
    where: { id: instancia.id },
    data: { status: 'REALIZADO' },
  });
  await prisma.slotAtribuicao.update({
    where: { id: atribuicao.id },
    data: { status: 'REALIZADO' },
  });
  await prisma.agendamento.updateMany({
    where: { passeioId: passeio.id },
    data: { status: 'CONFIRMADO' },
  });

  console.log(`✅ Slot, instância e atribuição marcados como REALIZADO`);
  console.log(`✅ ${agendamentos.length} agendamentos como CONFIRMADO`);

  // ─── RESUMO ────────────────────────────────────────────────────

  console.log('');
  console.log('══════════════════════════════════════');
  console.log('🎉 CAMINHO FELIZ — TESTE CONCLUÍDO');
  console.log('══════════════════════════════════════');
  console.log(`📦 Slot:        #${slot.id} — ${slot.titulo}`);
  console.log(`📅 Instância:   #${instancia.id}`);
  console.log(`🚂 Passeio:     #${passeio.id}`);
  agendamentos.forEach((ag, i) => {
    console.log(`📋 Agto #${i + 1}: #${ag.id} — ${clientes[i].nome}`);
  });
  console.log(`🎯 Atribuição:  #${atribuicao.id} — ${vagoneteiro.name}`);
  console.log(`✅ Status final: REALIZADO`);
  console.log('══════════════════════════════════════');
  console.log('');
}

main().catch((e) => {
  console.error('❌ Erro no teste:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
