# BRISA Vagonetas

[![Node](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

Sistema da **Associação dos Vagoneteiros dos Molhes da Barra do Rio Grande**.  
Plataforma digital para divulgação, agendamento de passeios e gestão administrativa dos vagoneteiros.

---

## Estrutura do Repositório

```
├── AssociacaoVagoneteiros_site/   # Projeto principal
│   ├── backend/                   # API REST (Express + Prisma + PostgreSQL)
│   ├── frontend/                  # SPA (React + Vite + Tailwind)
│   ├── docs/                      # Documentação complementar
│   ├── docker-compose.yml         # Banco de dados PostgreSQL
│   ├── README.md                  # README do projeto principal
│   └── roadmap.md                 # Roadmap de desenvolvimento
└── README.md                      # ← Este arquivo
```

---

## Sobre o Projeto

O projeto tem como objetivo promover a **valorização, modernização e fortalecimento** da atividade dos Vagoneteiros dos Molhes da Barra, na cidade do Rio Grande (RS), por meio de uma solução tecnológica digital.

### Funcionalidades Principais

| Funcionalidade | Descrição |
|---|---|
| **Autenticação** | Login com CPF ou e-mail, perfis de acesso (ADMIN, USUARIO, VAGONETEIRO) |
| **Gestão de Vagoneteiros** | Cadastro, edição, ativação/desativação, upload de foto |
| **Passeios** | Criação e gerenciamento de passeios |
| **Agendamentos** | Sistema de agendamento com calendário, horários e vagas disponíveis |
| **Clientes** | Cadastro de clientes |
| **Painel Administrativo** | Gestão de vagoneteiros, passeios e agendamentos  |
| **Responsivo** | Interface adaptada para mobile e desktop |


## Como Rodar

### Pré-requisitos

- Node.js
- Docker e Docker Compose (para o banco PostgreSQL)
- npm

### 1. Subir o banco de dados

```bash
cd AssociacaoVagoneteiros_site
docker compose up -d
```

### 2. Configurar e rodar o backend

```bash
cd AssociacaoVagoneteiros_site/backend
cp .env.example .env  
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

### 3. Rodar o frontend

```bash
cd AssociacaoVagoneteiros_site/frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173` e o backend em `http://localhost:3000`.

