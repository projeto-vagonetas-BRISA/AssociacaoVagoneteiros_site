import prisma from '../lib/prisma';

/**
 * Anonimização de dados pessoais (LGPD).
 *
 * Em vez de apagar fisicamente o registro (o que quebraria relatórios,
 * contagens e histórico de passeios/agendamentos), substitui os campos
 * pessoais por placeholders genéricos e marca `anonimizado = true`.
 *
 * As chaves estrangeiras e os campos numéricos/agregáveis (status, preço,
 * data, acompanhantes) são preservados → relatórios continuam íntegros.
 * As relações continuam apontando para o registro anônimo (que não tem mais
 * dado pessoal), então está tudo consistente.
 */

const NOME_ANONIMO = 'Usuário anônimo';
const CLIENTE_ANONIMO = 'Cliente anônimo';
const TELEFONE_ANONIMO = '0000000000';
const HISTORICO_ANONIMO = '[removido por LGPD]';
const COMENTARIO_ANONIMO = 'Comentário removido por solicitação do titular (LGPD)';

/** CPF fake único por id (garante unicidade do campo @unique). */
function cpfAnonimo(id: number): string {
  return String(id).padStart(11, '0');
}

/** E-mail fake único por id (garante unicidade do campo @unique). */
function emailAnonimo(id: number): string {
  return `anonimizado_${id}@excluido.local`;
}

/**
 * Anonimiza um USUARIO (vagoneteiro/admin/etc). Mantém o registro (relações e
 * contagens preservadas) mas apaga todos os dados pessoais e bloqueia login.
 */
export async function anonimizarUsuario(id: number): Promise<{
  tipo: 'USUARIO';
  id: number;
  afetados: { passeios: number; slotPasseios: number; resetTokens: number };
}> {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) throw new Error('Usuário não encontrado');
  if (usuario.anonimizado) throw new Error('Usuário já foi anonimizado');

  // Substitui dados pessoais, remove credencial (senha/foto), desativa login.
  await prisma.usuario.update({
    where: { id },
    data: {
      name: NOME_ANONIMO,
      cpf: cpfAnonimo(id),
      email: emailAnonimo(id),
      telefone: TELEFONE_ANONIMO,
      senha: '[removida por LGPD]',
      foto: null,
      historico: HISTORICO_ANONIMO,
      ativo: false,
      anonimizado: true,
    },
  });

  // Revoga tokens de reset (impede redefinir senha de conta anônima).
  const { count: resetTokens } = await prisma.resetToken.deleteMany({ where: { usuarioId: id } });

  // Passeios e slots que apontavam para o vagoneteiro: libera o vínculo,
  // mantendo o passeio/slot e seus agendamentos (relatórios preservados).
  const { count: passeios } = await prisma.passeio.updateMany({
    where: { usuarioId: id },
    data: { usuarioId: null },
  });
  const { count: slotPasseios } = await prisma.slotPasseio.updateMany({
    where: { usuarioId: id },
    data: { usuarioId: null },
  });

  // As SlotAtribuicao continuam apontando para o usuário (agora anônimo) —
  // não vaza dado pessoal e mantém o histórico de atribuição intacto.

  return { tipo: 'USUARIO', id, afetados: { passeios, slotPasseios, resetTokens } };
}

/**
 * Anonimiza um CLIENTE (turista) e seus dados pessoais/avaliações.
 */
export async function anonimizarCliente(id: number): Promise<{
  tipo: 'CLIENTE';
  id: number;
  afetados: { pushes: number; avaliacoes: number };
}> {
  const cliente = await prisma.clientes.findUnique({ where: { id } });
  if (!cliente) throw new Error('Cliente não encontrado');
  if (cliente.anonimizado) throw new Error('Cliente já foi anonimizado');

  await prisma.clientes.update({
    where: { id },
    data: {
      nome: CLIENTE_ANONIMO,
      cpf: cpfAnonimo(id),
      telefone: TELEFONE_ANONIMO,
      email: emailAnonimo(id),
      anonimizado: true,
    },
  });

  // Remove inscrições de push (dados pessoais + canais de notificação).
  const { count: pushes } = await prisma.pushSubscription.deleteMany({ where: { clienteId: id } });

  // Anonimiza o texto livre das avaliações (pode conter dados pessoais);
  // mantém a nota para os relatórios de avaliação.
  const { count: avaliacoes } = await prisma.avaliacao.updateMany({
    where: { clienteId: id },
    data: { comentario: COMENTARIO_ANONIMO },
  });

  return { tipo: 'CLIENTE', id, afetados: { pushes, avaliacoes } };
}

/** Busca um usuário por CPF ou email (para o admin localizar pelo e-mail recebido). */
export async function buscarUsuarioPorIdentificador(identificador: string): Promise<{ tipo: 'USUARIO'; id: number; name: string } | null> {
  const porCpf = await prisma.usuario.findUnique({ where: { cpf: identificador } });
  if (porCpf) return { tipo: 'USUARIO', id: porCpf.id, name: porCpf.name };

  const porEmail = await prisma.usuario.findUnique({ where: { email: identificador } });
  if (porEmail) return { tipo: 'USUARIO', id: porEmail.id, name: porEmail.name };

  return null;
}

/** Busca um cliente por CPF ou email. */
export async function buscarClientePorIdentificador(identificador: string): Promise<{ tipo: 'CLIENTE'; id: number; nome: string } | null> {
  const porCpf = await prisma.clientes.findUnique({ where: { cpf: identificador } });
  if (porCpf) return { tipo: 'CLIENTE', id: porCpf.id, nome: porCpf.nome };

  const porEmail = await prisma.clientes.findUnique({ where: { email: identificador } });
  if (porEmail) return { tipo: 'CLIENTE', id: porEmail.id, nome: porEmail.nome };

  return null;
}
