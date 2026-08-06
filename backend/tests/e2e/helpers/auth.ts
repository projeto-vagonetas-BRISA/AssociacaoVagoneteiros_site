import { Page } from '@playwright/test';

/** Abre o popup de login clicando em "Entrar" no Header da página inicial. */
export async function abrirLogin(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar' }).first().click();
  // popup aparece com o form de login
  await page.locator('#email_cpf').waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Efetua login com as credenciais dadas usando a UI (popup de login).
 * Retorna a URL para onde o usuário foi redirecionado.
 */
export async function loginPelaUI(
  page: Page,
  identifier: string,
  senha: string,
): Promise<string> {
  await abrirLogin(page);
  await page.locator('#email_cpf').fill(identifier);
  await page.locator('#password').fill(senha);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  // espera navegação (não ficar mais no "/")
  await page.waitForURL((url) => url.pathname !== '/', { timeout: 15000 });
  return page.url();
}

/** Credenciais E2E (criadas por prisma/seed-e2e.ts). */
export const E2E_USERS = {
  admin: { identifier: 'admin@vagoneteiros.com', senha: 'admin123' },
  redator: { identifier: 'redator@vagoneteiros.com', senha: 'redator123' },
  vagoneteiro: { identifier: 'vagoneteiro@vagoneteiros.com', senha: 'vaga123' },
} as const;
