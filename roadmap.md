# Roadmap de Integração Frontend/Backend

> Release: `v1.0` (branch `release/v1.0`)
> Última atualização: 2026-07-08

---

## ✅ Concluído

### Infraestrutura
- [x] Backend Express 5 + Prisma 6 + PostgreSQL (Docker)
- [x] Frontend React 19 + Vite 8 + Tailwind v4
- [x] CORS configurado (backend `:3000` → frontend `:5173`)
- [x] Branch `release/v1.0` com frontend + backend integrados

### Autenticação & Sessão
- [x] Login/Logout com JWT (CPF ou e-mail)
- [x] Cadastro de vagoneteiro **não troca mais a sessão do admin** (`createOnly`)
- [x] Rotas protegidas por perfil (ADMIN, REDATOR, USUARIO)
- [x] Seed com 3 usuários (ADMIN, REDATOR, USUARIO)

### CRUD Vagoneteiros (COMPLETO)
- [x] Criar (`POST /auth/register` com perfil USUARIO)
- [x] Listar paginado (`GET /usuarios/vagoneteiros` — ordem alfabética)
- [x] Visualizar perfil (`GET /usuarios/:id` com foto e passeios)
- [x] Atualizar dados e foto (`PUT /usuarios/:id`)
- [x] Soft-delete via toggle ativo/inativo (`PATCH /usuarios/vagoneteiros/:id/ativo`)
- [x] Upload de foto (base64, max 5MB)
- [x] Toggle Power liga/desliga no painel
- [x] Página de perfil individual com edição inline

### CRUDs do Backend (pendentes de integração)
- [x] Passeios (controller + routes)
- [x] Clientes (controller + routes)
- [x] Agendamentos (controller + routes)
- [x] Avaliações (controller + routes)
- [x] Usuários (controller + routes)
- [x] Documentação da API (`agendamento.md`)

### Painel Administrativo
- [x] Painel admin lista vagoneteiros da API com paginação (`GET /usuarios/vagoneteiros`)
- [x] Vagoneteiros em ordem alfabética, paginados (5 por página)
- [x] Avatar com foto ou iniciais — link para perfil individual
- [x] Toggle ativar/desativar vagoneteiro (`PATCH /usuarios/vagoneteiros/:id/ativo`)
- [x] Badge de status (Ativo verde / Inativo vermelho)

### Página de Perfil do Vagoneteiro
- [x] Rota `/admin/vagoneteiros/:id`
- [x] Foto, nome, status, CPF, telefone, e-mail
- [x] Experiência, histórico, total de passeios
- [x] Tabela de passeios realizados
- [x] Layout responsivo com gradiente + avatar

### Upload de Foto
- [x] Campo `foto` (Bytes) no schema Prisma
- [x] Cadastro aceita foto em base64 (máx 5MB)
- [x] Frontend envia foto no cadastro de vagoneteiro
- [x] Foto aparece na listagem e no perfil

---

## 🔄 Em Andamento / Pendente

### Páginas Admin (conectar com API)
- [ ] `Clientes.tsx` — listar, cadastrar, editar clientes da API
- [ ] `Passeios.tsx` — listar, cadastrar, editar passeios da API
- [ ] `Agendamentos.tsx` — listar, cadastrar, editar agendamentos
- [ ] `Avaliacoes.tsx` — listar avaliações
- [ ] `Usuarios.tsx` — listar e gerenciar usuários

### Páginas Públicas (conectar com API)
- [ ] `Home.tsx` — carregar avaliações e passeios da API (em vez de conteúdo estático)
- [ ] `Agendamento.tsx` — formulário de agendamento integrado com backend
- [ ] `Cadastro.tsx` (público) — cadastro de cliente integrado

### Cadastro de Passeio
- [ ] `CadastroPasseio.tsx` — formulário conectado com `POST /passeios`

### Melhorias
- [ ] Upload de foto via multipart/form-data em vez de base64
- [ ] Excluir vagoneteiro com confirmação
- [ ] Filtro por status (ativo/inativo) na listagem de vagoneteiros
- [ ] Página de listagem completa de vagoneteiros (fora do painel)

### Testes
- [ ] Fluxo completo: login admin → criar vagoneteiro → criar passeio → criar cliente → criar agendamento
- [ ] Verificar permissões (REDATOR vs ADMIN)
- [ ] Testar paginação em todas as listagens

---

## Como Rodar

```bash
# Backend
cd backend
cp .env.example .env  # configurar DATABASE_URL
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend
cd frontend
npm run dev
```

**Seed padrão:**
| Perfil | CPF | Senha |
|--------|-----|-------|
| ADMIN | 000.000.000-00 | admin123 |
| REDATOR | 111.111.111-11 | redator123 |
| USUARIO | 222.222.222-22 | vaga123 |
