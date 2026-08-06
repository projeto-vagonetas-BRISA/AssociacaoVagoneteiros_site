import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — Playwright.
 *
 * Roda contra o BACKEND LOCAL (porta 3001, isolado do container da :3000),
 * que serve o frontend buildado (frontend/dist) + API real contra o banco.
 *
 * Antes de subir, aplica o seed E2E não-destrutivo (cria admin/redator/vagoneteiro
 * de teste via upsert, sem apagar dados).
 *
 * Rodar:
 *   npx playwright test                          # suíte completa
 *   npx playwright test tests/e2e/login.spec.ts   # arquivo específico
 *   npx playwright test --headed                  # com navegador visível
 */
const PORT = process.env.E2E_PORT || '3001';
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command:
      `npx ts-node --transpile-only prisma/seed-e2e.ts && ` +
      `PORT=${PORT} npx ts-node --transpile-only src/server.ts`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI && Boolean(process.env.REUSE_SERVER),
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
