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
