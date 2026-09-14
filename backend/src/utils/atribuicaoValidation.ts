/** tipos que representam o resultado de uma validação. */
export type ValidadorResultado =
  | { ok: true }
  | { ok: false; status: number; mensagem: string };

function falha(status: number, mensagem: string): ValidadorResultado {
  return { ok: false, status, mensagem };
}

function sucesso(): ValidadorResultado {
  return { ok: true };
}

/** converte um id de rota (string) em number válido. null se inválido. */
export function parseIdRota(valor: unknown): number | null {
  const num = Number(valor);
  return isNaN(num) ? null : num;
}

/**
 * normaliza uma data para o início do dia local (00:00:00.000),
 * permitindo comparação apenas pela "data calendário".
 */
export function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** indica se uma data (calendário) é anterior a hoje. */
export function ehDataPassada(data: Date, referencia: Date = new Date()): boolean {
  return inicioDoDia(data) < inicioDoDia(referencia);
}

/**
 * valida que a data da instância não esteja no passado.
 */
export function validarDataNaoPassada(data: Date): ValidadorResultado {
  if (ehDataPassada(data)) {
    return falha(400, 'Não é possível operar sobre uma instância com data passada');
  }
  return sucesso();
}

/** indica se um status de instância impede atribuição. */
export function instanciaImpedeAtribuicao(
  status: string | undefined,
): status is 'CANCELADO' | 'REALIZADO' {
  return status === 'CANCELADO' || status === 'REALIZADO';
}

/** monta a mensagem de erro para instância cancelada ou realizada. */
export function mensagemInstanciaIndisponivel(status: 'CANCELADO' | 'REALIZADO'): string {
  return `Instância está ${status === 'CANCELADO' ? 'cancelada' : 'realizada'}`;
}

/** aplica um validador ao `res` (respondendo em caso de falha). */
export function responderSeFalhar(res: { status: (s: number) => { json: (b: unknown) => void } }, resultado: ValidadorResultado): boolean {
  if (!resultado.ok) {
    res.status(resultado.status).json({ message: resultado.mensagem });
    return true;
  }
  return false;
}

/**
 * paginação: deriva { skip, take } a partir de page/limit crus do query,
 * com clamps seguros (page >= 1, limit entre 1 e 50).
 */
export function calcularPaginacao(page: unknown, limit: unknown, maxLimite = 50): { pagina: number; limite: number; skip: number } {
  const pagina = Math.max(1, parseInt(page as string, 10) || 1);
  const limite = Math.min(maxLimite, Math.max(1, parseInt(limit as string, 10) || 20));
  return { pagina, limite, skip: (pagina - 1) * limite };
}

/**
 * soma o total de pessoas (turista + acompanhantes) em uma lista de agendamentos.
 * usado para saber quantas vagas de um passeio já estão ocupadas.
 */
export function contarPessoasAgendadas(agendamentos: Array<{ acompanhantes?: number | null }>): number {
  return agendamentos.reduce((acc, a) => acc + 1 + (a.acompanhantes || 0), 0);
}

/** agrupa uma lista de itens por data (chave iso ano-mês-dia). */
export function agruparPorData<T extends { data: Date }>(itens: T[]): Record<string, T[]> {
  const agrupado: Record<string, T[]> = {};
  for (const item of itens) {
    const chave = new Date(item.data).toISOString().split('T')[0];
    if (!agrupado[chave]) agrupado[chave] = [];
    agrupado[chave].push(item);
  }
  return agrupado;
}

/** formata uma data em pt-br (ex.: "22/12/2026"). */
export function formatarDataLocal(data: Date | null | undefined): string {
  return data ? new Date(data).toLocaleDateString('pt-BR') : '';
}
