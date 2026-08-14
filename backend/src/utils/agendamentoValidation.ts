/**
 * Validações puras e reutilizáveis para agendamentos.
 *
 * Segue os princípios de Código Limpo: funções pequenas, com UMA responsabilidade,
 * nomes que dizem o que fazem, e sem misturar lógica HTTP/negócio.
 * Estas funções NÃO dependem de express (req/res) nem de prisma — são puras.
 */

/** Normaliza um telefone removendo tudo que não é dígito. */
export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

/** Normaliza um email (trim + lowercase). Retorna string vazia se vazio. */
export function limparEmail(email?: string | null): string {
  return email ? email.trim().toLowerCase() : '';
}

/** Normaliza um documento (CPF/CNPJ) removendo não-dígitos. */
export function limparDocumento(documento?: string | null): string {
  return documento ? documento.replace(/\D/g, '') : '';
}

/** Indica se um documento tem comprimento de CPF (11) ou CNPJ (14). */
export function ehDocumentoValido(documento: string): boolean {
  return documento.length === 11 || documento.length === 14;
}

/** Tipos que representam o resultado de uma validação. */
export type ValidadorResultado =
  | { ok: true }
  | { ok: false; status: number; mensagem: string };

function falha(status: number, mensagem: string): ValidadorResultado {
  return { ok: false, status, mensagem };
}

function sucesso(): ValidadorResultado {
  return { ok: true };
}

/**
 * Valida os campos obrigatórios de um agendamento público
 * (nome/telefone + instanciaId OU passeioId).
 */
export function validarCamposObrigatoriosPublico(nome: unknown, telefone: unknown, passeioId: unknown, instanciaId: unknown): ValidadorResultado {
  if (!nome || !telefone || (!passeioId && !instanciaId)) {
    return falha(400, 'nome, telefone e instanciaId ou passeioId são obrigatórios');
  }
  return sucesso();
}

/**
 * Converte um possível id (string|number) para number, validando.
 * Retorna undefined se ausente; retorna null se inválido (não é número).
 */
export function parseIdOpcional(valor: unknown): number | null | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  const num = Number(valor);
  return isNaN(num) ? null : num;
}

/**
 * Valida que instanciaId e passeioId (se presentes) são números válidos.
 */
export function validarIds(passeioId: unknown, instanciaId: unknown): ValidadorResultado {
  const parsedPasseio = parseIdOpcional(passeioId);
  const parsedInstancia = parseIdOpcional(instanciaId);
  if (parsedInstancia === null) {
    return falha(400, 'instanciaId inválido');
  }
  if (parsedPasseio === null) {
    return falha(400, 'passeioId inválido');
  }
  return sucesso();
}

/**
 * Valida que a data do passeio não esteja no passado.
 * Considera o fim do dia local (23:59:59.999) como limite.
 */
export function assertPasseioNaoPassado(data: Date): ValidadorResultado {
  const agora = new Date();
  const fimDoDia = new Date(data);
  fimDoDia.setHours(23, 59, 59, 999);
  if (fimDoDia < agora) {
    return falha(400, 'Não é possível agendar para uma data passada');
  }
  return sucesso();
}

/**
 * Valida que a capacidade do passeio comporta as vagas solicitadas.
 */
export function validarCapacidade(disponiveis: number, vagasSolicitadas: number): ValidadorResultado {
  if (vagasSolicitadas > disponiveis) {
    return falha(400, 'Passeio lotado. Vagas insuficientes');
  }
  return sucesso();
}

/**
 * Aplica um validador ao `res` (respondendo em caso de falha).
 * Retorna true se a validação falhou (e a resposta foi enviada); false se passou.
 *
 * Uso:
 *   if (falhouValidacao(res, validarCamposObrigatoriosPublico(...))) return;
 */
export function responderSeFalhar(res: { status: (s: number) => { json: (b: unknown) => void } }, resultado: ValidadorResultado): boolean {
  if (!resultado.ok) {
    res.status(resultado.status).json({ message: resultado.mensagem });
    return true;
  }
  return false;
}
