import { test, expect } from '@playwright/test';
import { loginPelaUI, E2E_USERS } from './helpers/auth';

test.describe('Navegação pública (E2E)', () => {
  for (const { rota, titulo } of [
    { rota: '/', titulo: 'Home' },
    { rota: '/galeria', titulo: 'Galeria' },
    { rota: '/historia', titulo: 'História' },
    { rota: '/investimento', titulo: 'Investimento' },
    { rota: '/agendamento', titulo: 'Agendar' },
    { rota: '/consulta-agendamento', titulo: 'Consultar' },
  ]) {
    test(`página ${titulo} (${rota}) carrega sem erro`, async ({ page }) => {
      const erros: string[] = [];
      page.on('pageerror', (err) => erros.push(err.message));

      const resp = await page.goto(rota, { waitUntil: 'domcontentloaded' });
      expect(resp?.status(), `GET ${rota} deveria responder 200`).toBe(200);

      // conteúdo de fato renderizado (não é a página de erro do SPA)
      await expect(page.locator('#root')).not.toBeEmpty();
      // manter a barra de navegação visível (Layout comum)
      await expect(page.locator('header')).toBeVisible();

      // sem erros de JS no console
      expect(erros, `errors de JS em ${rota}: ${erros.join('; ')}`).toEqual([]);
    });
  }
});

test.describe('Painel admin (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await loginPelaUI(page, E2E_USERS.admin.identifier, E2E_USERS.admin.senha);
  });

  test('admin acessa o painel e vê seções de gestão', async ({ page }) => {
    await expect(page).toHaveURL(/painel-admin/);
    // o painel deve conter áreas de gestão — verificamos por texto genérico
    const body = page.locator('body');
    await expect(body).toContainText(/vagoneteir|passeio|agendamento|resumo|painel/i, { timeout: 15000 });
  });

  test('header do painel mantém o usuário autenticado', async ({ page }) => {
    await expect(page.getByText('Administrador', { exact: false }).first())
      .toBeVisible({ timeout: 10000 });
  });
});
