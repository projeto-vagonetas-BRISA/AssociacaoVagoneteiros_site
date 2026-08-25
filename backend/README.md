# Vagoneteiros API

API do projeto Vagoneteiros, desenvolvida em Node.js com TypeScript, Express e Prisma.

## Pré-requisitos

- Node.js
- PostgreSQL

## Configuração do Ambiente

1. Clone o repositório
2. Crie um arquivo `.env` na raiz do projeto baseado no `.env.example` e configure as credenciais do seu banco de dados.
3. Instale as dependências:
   ```bash
   npm install
   ```

## Galeria do Google Drive

O backend expõe `GET /galeria/fotos`, que consulta a pasta do Google Drive usando service account e retorna as imagens para o frontend.

Configure também estas variáveis no `.env`:

- `GOOGLE_APPLICATION_CREDENTIALS`: caminho para o arquivo JSON da service account do Google.
- `GOOGLE_DRIVE_FOLDER_ID`: id da pasta da galeria no Drive.

A pasta precisa estar compartilhada com o e-mail da service account, senão a API não conseguirá listar os arquivos.

## Executando o Projeto

Para rodar em ambiente de desenvolvimento interativo:
```bash
npm run dev
```

Para gerar a build e rodar em produção:
```bash
npm run build
node dist/server.js
```

## Testes

Os testes (unitários + integração) rodam com **Vitest**:

```bash
npm test                # roda toda a suíte uma vez
npm run test:watch      # modo watch
npm run test:integration # só os testes de integração
npm run test:coverage   # suíte + relatório de cobertura
```

Para rodar um arquivo específico:

```bash
npx vitest run tests/controllers/authController.test.ts
npx vitest run tests/integration/agendamentos.integration.test.ts
```

### Suíte de testes (backend)

| Arquivo | O que cobre |
| ------- | ----------- |
| `tests/controllers/authController.test.ts` | Cadastro e login (validações, CPF, email, hash, token) |
| `tests/controllers/atribuicaoController.test.ts` | Auto-atribuição (instância inexistente, lotada, já pega, conflito de horário, sucesso) |
| `tests/controllers/dashboard.test.ts` | Métricas do dashboard (taxa de ocupação, receita, cancelados, período) |
| `tests/services/agendamento.service.test.ts` | ConflitoService (sobreposição de horário) e SlotFactory (Composite Pattern) |
| `tests/services/recorrencia.service.test.ts` | Helpers de horário e expansão de slots FIXO |
| `tests/services/vagas.service.test.ts` | Cálculo de vagas disponíveis por passeio |
| `tests/utils/documento.test.ts` | cleanCPF, validação de CPF e e-mail |
| `tests/utils/filtroData.test.ts` | Parsing e ajuste de período (fim do dia) |
| `tests/utils/notificationUtils.test.ts` | Calculo de horários de notificação (timezone) |

**Integração** — exercitam o app Express real via HTTP (`supertest`), com o Prisma mockado:

| Arquivo | O que cobre |
| ------- | ----------- |
| `tests/integration/auth.integration.test.ts` | Registro/login/me via HTTP, tokens malformados |
| `tests/integration/reset-senha.integration.test.ts` | Esqueci/redefinir senha (token, expiração, email) |
| `tests/integration/agendamentos.integration.test.ts` | Agendamento público, consulta, vagas, status, email de confirmação |
| `tests/integration/passeios.integration.test.ts` | Lista/busca/cria passeio (público + admin) |
| `tests/integration/atribuicoes.integration.test.ts` | Auto-atribuição (modelo Uber), minhas atribuições |
| `tests/integration/rbac.integration.test.ts` | Proteção por perfil (401/403): clientes, usuários, avaliações |
| `tests/integration/painel.integration.test.ts` | Resumo do painel e cache de avaliação |

Os testes usam **mocks do Prisma** — não tocam no banco de dados real. O helper `tests/integration/helpers/prismaMock.ts` cria o mock profundo do client, e os testes de integração importam o `app` real e disparam requisições HTTP com `supertest`.

## Testes E2E (Playwright)

Os testes E2E rodam contra o **backend local** (porta `3001`, isolada do container da `:3000`), que serve o frontend buildado (`frontend/dist`) + API real contra o banco.

```bash
npx playwright install chromium   # 1ª vez (baixa o navegador)
npm run test:e2e                  # suíte completa
npm run test:e2e:headed           # com navegador visível
npx playwright test tests/e2e/login.spec.ts   # arquivo específico
```

### Como funciona

- `playwright.config.ts` sobe o servidor automaticamente via `webServer`, aplicando antes o seed `prisma/seed-e2e.ts` (**não-destrutivo** — cria por upsert, sem apagar dados).
- Credenciais E2E: `admin@vagoneteiros.com`/`admin123`, `redator@vagoneteiros.com`/`redator123`, `vagoneteiro@vagoneteiros.com`/`vaga123`.
- Rodar na mesma máquina com o container da `:3000` ativo **não conflita** — os E2E usam a `:3001`.
- A porta pode ser trocada com `E2E_PORT` (ex.: `E2E_PORT=3002 npx playwright test`).

### Suíte E2E

| Arquivo | O que cobre |
| ------- | ----------- |
| `tests/e2e/login.spec.ts` | Login/admin/vagoneteiro/redator, senha incorreta, logout, home pública |
| `tests/e2e/navegacao.spec.ts` | Páginas públicas carregam 200 sem erros de JS; painel admin pós-login |
| `tests/e2e/helpers/auth.ts` | Helpers de autenticação pela UI (`loginPelaUI`) + credenciais E2E |
