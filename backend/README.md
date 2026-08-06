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

Os testes unitários rodam com **Vitest**:

```bash
npm test          # roda uma vez
npm run test:watch # modo watch
```

Para rodar um arquivo específico:

```bash
npx vitest run tests/controllers/authController.test.ts
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

Os testes usam **mocks do Prisma** — não tocam no banco de dados real.
