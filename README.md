# 🚂 Associação dos Vagoneteiros dos Molhes da Barra do Rio Grande

Sistema de gestão de passeios, agendamentos e vagoneteiros para a Associação dos Vagoneteiros dos Molhes da Barra, Rio Grande — RS.

---

## 📋 Índice

- [Stack](#-stack)
- [Arquitetura](#-arquitetura)
- [Primeiros Passos](#-primeiros-passos)
- [População do Banco](#-população-do-banco)
- [API REST](#-api-rest)
- [Sistema de Agendamento (Composite Pattern)](#-sistema-de-agendamento-composite-pattern)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Commits](#-commits)

---

## 🛠 Stack

| Camada | Tecnologia |
|--------|-----------|
| **Backend** | Node.js + Express 5 + TypeScript |
| **ORM** | Prisma 6 |
| **Banco** | PostgreSQL 16 |
| **Cache** | *(futuro)* Redis |
| **Frontend** | React + Vite + Tailwind CSS |
| **Auth** | JWT (bcrypt + jsonwebtoken) |
| **Testes** | *(pendente)* Jest |

---

## 🏗 Arquitetura

```
Frontend (Vite + React) ──http──▶ Backend (Express 5) ──prisma──▶ PostgreSQL
                                        │
                                   ┌────┴────┐
                                   │ Services │
                                   │  • Recorrência (Engine)
                                   │  • Composite (SlotFixo/Lote/Individual)
                                   │  • Conflitos
                                   └─────────┘
```

### Ambiente Atual

| Serviço | Acesso |
|---------|--------|
| **Frontend** | `http://177.153.194.118:5173` |
| **API** | `http://177.153.194.118:3000` |
| **Banco** | PostgreSQL via Docker (`pg-vagon:5432`) |

---

## 🚀 Primeiros Passos

### 1. Subir PostgreSQL

```bash
docker run -d \
  --name pg-vagon \
  -e POSTGRES_USER=vagoneteiro \
  -e POSTGRES_PASSWORD=*** \
  -e POSTGRES_DB=vagoneteiros_db \
  -p 5432:5432 \
  postgres:16
```

### 2. Configurar Backend

```bash
cd backend
cp .env.example .env
# Editar DATABASE_URL com credenciais corretas
npm install
npx prisma migrate dev
npm run dev
```

### 3. Configurar Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_URL=http://localhost:3000 (ou IP do servidor)
npm install
npm run dev
```

### 4. Acessar

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

---

## 🧪 População do Banco

O projeto conta com dois scripts de seed:

### Seed básico (admin + redator + vagoneteiro de teste)

```bash
cd backend
npm run seed
```

Cria:
- 👑 **Admin:** CPF `127.389.852-46` / senha `admin123`
- ✏️ **Redator:** CPF `732.299.287-33` / senha `redator123`
- 👤 **Vagoneteiro:** CPF `879.129.164-07` / senha `vaga123`

### Seed completo (dados massivos)

```bash
cd backend
npm run seed:full
```

Popula automaticamente:

| Entidade | Quantidade |
|----------|-----------|
| 👑 Admin | 1 |
| 🚂 Vagoneteiros | **35** |
| 👥 Clientes (turistas + agências) | **500** |
| 🗓️ Passeios (~20/dia até 31/12) | **~3.120** |
| 📋 Agendamentos (~metade preenchidos) | **~4.700** |

---

## 📡 API REST

### Autenticação

```
POST /auth/login          { "identifier": "cpf ou email", "senha": "..." }
POST /auth/register       { "name", "cpf", "senha", "telefone", "email?" }
POST /auth/register/admin { "name", "cpf", "senha", "email", "telefone" }  [ADMIN]
GET  /auth/me             [auth]
```

### Passeios (legado)

```
GET    /passeios              Listar (paginado)
GET    /passeios/:id          Detalhe
POST   /passeios              Criar                     [ADMIN/REDATOR]
PUT    /passeios/:id          Atualizar                 [auth]
DELETE /passeios/:id          Desativar (soft-delete)   [auth]
```

### Slots (novo sistema — Composite Pattern)

```
GET    /slots                    Listar (filtros: tipo, status, usuarioId)
GET    /slots/:id                Detalhe com instâncias + atribuições
GET    /slots/:id/instancias     Listar instâncias de um slot
GET    /slots/disponiveis        Listar slots com vagas futuras
POST   /slots                    Criar slot (FIXO/LOTE/INDIVIDUAL)  [ADMIN/REDATOR]
PUT    /slots/:id                Atualizar slot                     [ADMIN/REDATOR]
DELETE /slots/:id                Cancelar slot                      [ADMIN/REDATOR]
POST   /slots/:id/expandir       Expandir recorrência manualmente   [ADMIN/REDATOR]
POST   /slots/lotes/gerar        Gerar lote de slots individuais    [ADMIN/REDATOR]
```

### Clientes

```
GET    /clientes              Listar
GET    /clientes/busca/:doc   Buscar por CPF/CNPJ
GET    /clientes/:id          Detalhe
POST   /clientes              Criar                     [ADMIN/REDATOR]
PUT    /clientes/:id          Atualizar                 [ADMIN/REDATOR]
DELETE /clientes/:id          Deletar                   [ADMIN/REDATOR]
```

### Agendamentos

```
GET    /agendamentos/vagas-disponiveis    Passeios com vagas (público)
POST   /agendamentos/publico              Agendamento público (autocadastro)
GET    /agendamentos                      Listar                      [auth]
GET    /agendamentos/:id                  Detalhe                     [auth]
POST   /agendamentos                      Criar                       [ADMIN/REDATOR]
PATCH  /agendamentos/:id/status           Atualizar status            [ADMIN/REDATOR]
DELETE /agendamentos/:id                  Deletar                     [ADMIN/REDATOR]
```

### Usuários / Vagoneteiros

```
GET    /usuarios/vagoneteiros    Listar vagoneteiros (paginado)  [ADMIN/REDATOR]
GET    /usuarios                 Listar todos                   [ADMIN/REDATOR]
GET    /usuarios/:id             Buscar por ID                  [auth]
PUT    /usuarios/:id             Atualizar                      [auth]
DELETE /usuarios/:id             Deletar                        [ADMIN]
```

### Galeria

```
GET    /galeria/fotos        Listar fotos da galeria
GET    /galeria/imagem/:id   Servir imagem
```

---

## 🧩 Sistema de Agendamento (Composite Pattern)

O coração do sistema novo. Substitui o modelo antigo de `Passeio` por um sistema flexível baseado no padrão **Composite**.

### Modelos

```
SlotPasseio (abstract/component)
├── FIXO       → Recorrência semanal (ex: todo SÁBADO às 09:00)
├── LOTE       → Grupo de slots gerados em lote (ex: 20 dias específicos)
└── INDIVIDUAL → Slot avulso (manual)

SlotInstancia → Expansão concreta de um slot em uma data específica
SlotAtribuicao → Vagoneteiro atribuído a um slot/instância
```

### Engine de Recorrência

**Arquivo:** `backend/src/services/recorrencia.service.ts`

Responsabilidades:
- Expandir `SlotFIXO` em instâncias no calendário
- Validar dia da semana e intervalo de dias
- Ajustar fim de mês (ex: dia 31 → 28/29)
- Não duplicar instâncias já existentes
- Gerar lotes de slots a partir de configuração

### Composite Pattern

**Arquivo:** `backend/src/services/agendamento.service.ts`

```typescript
interface SlotComponent {
  getTipo(): TipoSlot
  getHorario(): { inicio: string; fim: string }
  getInstancias(periodo): Promise<SlotInstancia[]>
}

SlotFactory.criar(slot) → SlotFixo | SlotLote | SlotIndividual
```

### Validação de Conflitos

```typescript
ConflitoService.verificarConflitoVagoneteiro(vagoneteiroId, data, horaInicio, horaFim)
ConflitoService.verificarCapacidade(slotPasseioId)
```

---

## 📁 Estrutura do Projeto

```
associacao-site/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          ← Modelos do banco
│   │   ├── seed.ts                ← Seed básico
│   │   ├── seed-full.ts           ← Seed massivo (35 vaga, 500 clientes, 3K passeios)
│   │   └── migrations/            ← Migrações Prisma
│   └── src/
│       ├── controllers/
│       │   ├── slotController.ts      ← CRUD de slots (Composite)
│       │   ├── agendamentoController.ts
│       │   ├── authController.ts
│       │   ├── passeioController.ts
│       │   └── ...
│       ├── services/
│       │   ├── recorrencia.service.ts ← Engine de recorrência
│       │   └── agendamento.service.ts ← Composite + Conflitos
│       ├── routes/
│       │   ├── slotRoutes.ts          ← Rotas de slots
│       │   └── ...
│       └── middlewares/
│           └── auth.ts
└── frontend/
    └── src/
        ├── pages/
        │   ├── Agendamento.tsx        ← Página de agendamento público
        │   ├── PainelAdm.tsx          ← Painel admin (paginacão inteligente)
        │   ├── ConsultaAgendamento.tsx
        │   └── ...
        ├── components/
        │   ├── LoginPopUp.tsx         ← Login com máscara de CPF
        │   └── ...
        └── services/
            └── api.ts
```

---

## 📜 Commits

| Commit | Descrição |
|--------|-----------|
| `a1c3fdf` | Script de povoamento + paginação inteligente |
| `0e22957` | Seed com CPFs válidos e limpeza na ordem correta |
| `25118f6` | seed-full.ts + paginação com max 20 botões |
| `a83091d` | Merge funcionalidades de dev-release |
| `142d422` | Validação de datas passadas (backend + frontend) |
| `48b70a6` | Fix criação de agendamentos em datas passadas |

---

## 👥 Credenciais de Teste

| Perfil | CPF | Email | Senha |
|--------|-----|-------|-------|
| 👑 **Admin** | `127.389.852-46` | `admin@vagoneteiros.com` | `admin123` |
| ✏️ **Redator** | `732.299.287-33` | `redator@vagoneteiros.com` | `redator123` |
| 👤 **Vagoneteiro** | `879.129.164-07` | `vagoneteiro@vagoneteiros.com` | `vaga123` |

---

## 🔮 Próximos Passos

- [ ] **Task 2 — Auto-Atribuição (modelo Uber)**
  - Frontend: Feed de passeios disponíveis
  - Vagoneteiro se auto-atribui a slots
  - Notificações em tempo real
- [ ] Testes unitários (Jest)
- [ ] Deploy em produção
- [ ] CI/CD

---

> Projeto desenvolvido para a Associação dos Vagoneteiros dos Molhes da Barra do Rio Grande.
