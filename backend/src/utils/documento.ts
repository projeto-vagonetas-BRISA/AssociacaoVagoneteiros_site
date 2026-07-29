/**
 * Helpers para limpeza e validação de CPF/documento
 */

/** Remove tudo que não é dígito */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/** Valida se CPF tem 11 dígitos */
export function isValidCPF(cpf: string): boolean {
  return cleanCPF(cpf).length === 11;
}

/** Valida email simples */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
