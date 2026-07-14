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
