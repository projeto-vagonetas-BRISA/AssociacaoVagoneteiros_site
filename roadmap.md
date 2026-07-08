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
- [x] Correção de vazamento de conexões Prisma em desenvolvimento
- [x] Rota `/usuarios/:id` liberada para autoedição/visualização do próprio perfil
- [x] Bloqueio do servidor em produção caso `JWT_SECRET` não seja fornecido
- [x] Validação de avaliações (somente clientes com agendamento confirmado)
- [x] Bug de contagem de capacidade ignorando agendamentos cancelados
- [x] Tratamento amigável para erro de chave estrangeira (delete cascade) na API

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

### Integração Frontend/Backend (Faltante)
- [ ] `PainelAdm.tsx` — carregar dados reais e estatísticas de Clientes, Agenda (Agendamentos) e Avaliações vindos do backend (atualmente mockados)
- [ ] `CadastroPasseio.tsx` — carregar lista real de vagoneteiros (`GET /usuarios/vagoneteiros`) e enviar `POST /passeios`
- [ ] `Agendamento.tsx` — carregar datas e horários dinâmicos de passeios (`GET /passeios`) e criar reserva com `POST /clientes` + `POST /agendamentos`
- [ ] `Home.tsx` — carregar depoimentos/avaliações recentes de forma dinâmica (`GET /avaliacoes`)

### Melhorias Gerais
- [ ] Migrar upload de fotos de Base64 para `multipart/form-data` usando Multer no backend
- [ ] Diálogo de confirmação visual para exclusões no painel
- [ ] Filtro rápido por status (ativo/inativo) na tabela de vagoneteiros

### Testes de Integração
- [ ] Fluxo completo E2E: criar vagoneteiro -> criar passeio -> agendar passeio publicamente -> aprovar agendamento no painel -> avaliar passeio pós-realização
- [ ] Testar limites de capacidade de agendamentos em concorrência
- [ ] Validar comportamento de paginação com grandes volumes de dados

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
