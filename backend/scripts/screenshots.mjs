import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const FRONTEND = 'http://localhost:5173';
const DIR = '../docs/screenshots';

mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
});

const page = await context.newPage();

// 1. Home
await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${DIR}/01-home.png`, fullPage: true });
console.log('01-home.png ✓');

// 2. Agendamento
await page.goto(`${FRONTEND}/agendamento`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${DIR}/02-agendamento.png`, fullPage: true });
console.log('02-agendamento.png ✓');

// 3. Login modal
await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const entrarBtn = page.locator('text=Entrar').first();
if (await entrarBtn.isVisible()) {
  await entrarBtn.click();
  await page.waitForTimeout(500);
}
await page.screenshot({ path: `${DIR}/03-login.png` });
console.log('03-login.png ✓');
await page.keyboard.press('Escape');
await page.waitForTimeout(200);

// 4. Esqueci senha
await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const entrarBtn2 = page.locator('text=Entrar').first();
if (await entrarBtn2.isVisible()) {
  await entrarBtn2.click();
  await page.waitForTimeout(500);
  const esqueciBtn = page.locator('text=Esqueceu sua senha').first();
  if (await esqueciBtn.isVisible()) {
    await esqueciBtn.click();
    await page.waitForTimeout(300);
  }
}
await page.screenshot({ path: `${DIR}/04-esqueci-senha.png` });
console.log('04-esqueci-senha.png ✓');

// 5. Galeria
await page.goto(`${FRONTEND}/galeria`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${DIR}/05-galeria.png`, fullPage: true });
console.log('05-galeria.png ✓');

// 6. Consulta agendamento
await page.goto(`${FRONTEND}/consulta-agendamento`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${DIR}/06-consulta-agendamento.png`, fullPage: true });
console.log('06-consulta-agendamento.png ✓');

// 7. Investimento
await page.goto(`${FRONTEND}/investimento`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${DIR}/07-investimento.png`, fullPage: true });
console.log('07-investimento.png ✓');

// 8. Login admin
await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const entrarBtn3 = page.locator('text=Entrar').first();
if (await entrarBtn3.isVisible()) {
  await entrarBtn3.click();
  await page.waitForTimeout(500);
  
  const inputId = page.locator('input[name="email_cpf"]');
  if (await inputId.isVisible()) {
    await inputId.fill('12738985246');
  }
  const inputSenha = page.locator('input[name="password"]');
  if (await inputSenha.isVisible()) {
    await inputSenha.fill('admin123');
  }
  
  const loginBtn = page.locator('button:has-text("Login")');
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(4000);
  }
}

// 9. Dashboard (logado)
await page.goto(`${FRONTEND}/painel-admin`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.waitForSelector('text=Dashboard', { timeout: 8000 }).catch(() => {});
await page.screenshot({ path: `${DIR}/09-dashboard.png`, fullPage: true });
console.log('09-dashboard.png ✓');

await browser.close();
console.log('\n✅ Screenshots salvos em docs/screenshots/');
