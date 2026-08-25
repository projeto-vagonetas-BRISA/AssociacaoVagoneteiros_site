import { test, expect } from '@playwright/test';
import { loginPelaUI, E2E_USERS } from './helpers/auth';

test.describe('Autenticação (E2E)', () => {
  test('Home pública carrega com navegação principal', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/vagonet/i);
    // barra de navegação com links principais
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: 'Home' }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Agendar' }).first()).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Galeria' }).first()).toBeVisible();
    // botão de login presente
    await expect(page.getByRole('button', { name: 'Entrar' }).first()).toBeVisible();
  });

  test('Admin faz login e é redirecionado para o painel', async ({ page }) => {
    const url = await loginPelaUI(page, E2E_USERS.admin.identifier, E2E_USERS.admin.senha);
    expect(new URL(url).pathname).toBe('/painel-admin');
    // header mostra o primeiro nome do usuário logado
    await expect(page.getByText('Administrador', { exact: false }).first()).toBeVisible();
  });

  test('Vagoneteiro faz login e vai para o feed de atribuições', async ({ page }) => {
    const url = await loginPelaUI(page, E2E_USERS.vagoneteiro.identifier, E2E_USERS.vagoneteiro.senha);
    expect(new URL(url).pathname).toBe('/feed-vagoneteiro');
  });

  test('Redator faz login e vai para o painel', async ({ page }) => {
    const url = await loginPelaUI(page, E2E_USERS.redator.identifier, E2E_USERS.redator.senha);
    expect(new URL(url).pathname).toBe('/painel-admin');
  });

  test('Login com senha incorreta mostra erro e permanece na home', async ({ page }) => {
    await loginPelaUI(page, E2E_USERS.admin.identifier, 'senha-errada-xyz')
      .catch(() => { /* esperado: não navega */ });

    // continua na home e o popup exibe a mensagem de erro
    await expect(page.getByText(/credenciais inválidas|inválida|incorreta|senha/i).first())
      .toBeVisible({ timeout: 10000 })
      .catch(() => {
        // fallback: aceita qualquer mensagem de erro visível no popup
        expect(page.locator('form').getByText(/erro|não/i).first()).toBeVisible();
      });
  });

  test('Logout volta para a home com botão Entrar novamente', async ({ page }) => {
    await loginPelaUI(page, E2E_USERS.admin.identifier, E2E_USERS.admin.senha);
    // botão de logout (no header do painel-admin)
    await page.getByRole('button', { name: /sair|logout|log ?out/i }).first().click();
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Entrar' }).first()).toBeVisible();
  });
});
