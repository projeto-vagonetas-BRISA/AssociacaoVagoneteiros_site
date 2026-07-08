# Documentação Técnica — Sistema de Agendamento de Passeios

> Stack do backend: **Node.js · TypeScript · Express 5 · Prisma 6 · PostgreSQL**
>
> Endpoints disponíveis em: `http://localhost:3000`

---

## Sumário

1. [Modelos de Dados](#1-modelos-de-dados)
2. [Endpoints de Passeios](#2-endpoints-de-passeios)
3. [Endpoints de Clientes](#3-endpoints-de-clientes)
4. [Endpoints de Agendamentos](#4-endpoints-de-agendamentos)
5. [Endpoints de Avaliações](#5-endpoints-de-avaliações)
6. [Endpoints de Usuários (Admin)](#6-endpoints-de-usuários-admin)
7. [Fluxos Completos](#7-fluxos-completos)
8. [Boas Práticas para o Frontend](#8-boas-práticas-para-o-frontend)
9. [Exemplos Práticos](#9-exemplos-práticos)
10. [Checklist de Integração](#10-checklist-de-integração)

---

## 1. Modelos de Dados

### 1.1 Passeio

```prisma
model Passeio {
  id           Int           @id @default(autoincrement())
  usuarioId   Int                                     // vagoneteiro responsável
  usuario     Usuario       @relation(fields: [usuarioId], references: [id])
  valor        Decimal       @db.Decimal(10, 2)       // preço por pessoa
  capacidade   Int                                    // vagas totais
  data         DateTime                               // data/hora do passeio
  agendamentos Agendamento[]                          // agendamentos vinculados
  avaliacoes   Avaliacao[]                            // avaliações vinculadas
  createdAt    DateTime      @default(now())
}
```

### 1.2 Cliente

```prisma
model Clientes {
  id           Int           @id @default(autoincrement())
  nome         String
  cpf          String        @unique
  telefone     String
  email        String?       @unique
  agendamentos Agendamento[]
  avaliacoes   Avaliacao[]
  createdAt    DateTime      @default(now())
}
```

### 1.3 Agendamento

```prisma
enum StatusAgendamento {
  PENDENTE
  CONFIRMADO
  CANCELADO
  REMARCADO
}

model Agendamento {
  id        Int               @id @default(autoincrement())
  clienteId Int
  cliente   Clientes          @relation(fields: [clienteId], references: [id])
  passeioId Int
  passeio   Passeio           @relation(fields: [passeioId], references: [id])
  status    StatusAgendamento @default(PENDENTE)
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt
}
```

### 1.4 Avaliação

```prisma
model Avaliacao {
  id         Int      @id @default(autoincrement())
  nota       Int                         // 1 a 5
  comentario String
  clienteId  Int
  cliente    Clientes @relation(fields: [clienteId], references: [id])
  passeioId  Int
  passeio    Passeio  @relation(fields: [passeioId], references: [id])
  createdAt  DateTime @default(now())
}
```

---

## 2. Endpoints de Passeios

> Base: `http://localhost:3000/passeios`

### 2.1 Listar todos os passeios

```
GET /passeios
Authorization: Bearer <TOKEN>
```

Retorna todos os passeios ordenados por data crescente, com dados do vagoneteiro e contagem de agendamentos/avaliações.

**Resposta (200):**

```json
[
  {
    "id": 1,
    "usuarioId": 3,
    "valor": "30.00",
    "capacidade": 20,
    "data": "2026-07-20T17:00:00.000Z",
    "createdAt": "2026-07-07T22:59:19.444Z",
    "usuario": { "id": 3, "name": "Vagoneteiro Teste" },
    "_count": { "agendamentos": 0, "avaliacoes": 0 }
  }
]
```

### 2.2 Buscar passeio por ID

```
GET /passeios/:id
Authorization: Bearer <TOKEN>
```

Retorna o passeio com agendamentos e avaliações completos.

**Resposta (200):**

```json
{
  "id": 1,
  "usuarioId": 3,
  "valor": "30.00",
  "capacidade": 20,
  "data": "2026-07-20T17:00:00.000Z",
  "agendamentos": [],
  "avaliacoes": []
}
```

**Erro (404):** `{ "message": "Passeio não encontrado" }`

### 2.3 Criar passeio

```
POST /passeios
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "valor": 35.00,
  "capacidade": 20,
  "data": "2026-07-25T09:00:00.000-03:00"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `valor` | number | ✅ | Preço por pessoa (> 0) |
| `capacidade` | number | ✅ | Vagas totais (> 0) |
| `data` | string (ISO) | ✅ | Data/hora do passeio |
| `usuarioId` | number | ❌ | Só ADMIN/REDATOR podem especificar. Padrão: usuário logado |

**Resposta (201):** O passeio criado com dados do vagoneteiro.

**Regras de perfil:**
- `USUARIO` (vagoneteiro comum): o passeio é vinculado automaticamente a ele
- `ADMIN` ou `REDATOR`: podem especificar `usuarioId` para vincular a qualquer vagoneteiro

### 2.4 Atualizar passeio

```
PUT /passeios/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "valor": 40.00,
  "capacidade": 25,
  "data": "2026-07-26T14:00:00.000-03:00"
}
```

Todos os campos são opcionais no PUT. Envie apenas o que deseja alterar.

**Resposta (200):** O passeio atualizado.

**Regras de perfil:**
- `ADMIN` ou `REDATOR`: podem editar qualquer passeio
- `USUARIO`: só pode editar passeios próprios

### 2.5 Deletar passeio

```
DELETE /passeios/:id
Authorization: Bearer <TOKEN>
```

**Resposta (200):** `{ "message": "Passeio deletado com sucesso" }`

**Regras de perfil:** mesmas do PUT.

---

## 3. Endpoints de Clientes

> Base: `http://localhost:3000/clientes`

### 3.1 Listar clientes

```
GET /clientes
Authorization: Bearer <TOKEN>
```

Retorna todos os clientes com contagem de agendamentos e avaliações.

### 3.2 Buscar cliente por ID

```
GET /clientes/:id
Authorization: Bearer <TOKEN>
```

Retorna o cliente com seus agendamentos e avaliações.

### 3.3 Criar cliente

```
POST /clientes
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "nome": "Maria Silva",
  "cpf": "123.456.789-09",
  "telefone": "(53) 99999-8888",
  "email": "maria@email.com"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | string | ✅ | Nome completo |
| `cpf` | string | ✅ | Com ou sem pontuação |
| `telefone` | string | ✅ | Telefone de contato |
| `email` | string | ❌ | Único, se fornecido |

**Regras de perfil:** ADMIN ou REDATOR.

### 3.4 Atualizar cliente

```
PUT /clientes/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "nome": "Maria Silva Atualizada",
  "telefone": "(53) 99999-7777",
  "email": "maria.novo@email.com"
}
```

CPF não pode ser alterado (identificador único). Todos os campos são opcionais.

**Regras de perfil:** ADMIN ou REDATOR.

### 3.5 Deletar cliente

```
DELETE /clientes/:id
Authorization: Bearer <TOKEN>
```

⚠️ Remove o cliente e todos os agendamentos/avaliações vinculados.

**Regras de perfil:** ADMIN ou REDATOR.

---

## 4. Endpoints de Agendamentos

> Base: `http://localhost:3000/agendamentos`

### 4.1 Listar agendamentos

```
GET /agendamentos
Authorization: Bearer <TOKEN>
```

Retorna todos os agendamentos com dados do cliente e do passeio.

**Resposta (200):**

```json
[
  {
    "id": 1,
    "clienteId": 1,
    "passeioId": 1,
    "status": "PENDENTE",
    "createdAt": "...",
    "updatedAt": "...",
    "cliente": { "id": 1, "nome": "Maria Silva", "cpf": "12345678909" },
    "passeio": {
      "id": 1, "data": "2026-07-25T12:00:00.000Z", "valor": "35.00",
      "capacidade": 20,
      "usuario": { "id": 3, "name": "Vagoneteiro Teste" }
    }
  }
]
```

### 4.2 Buscar agendamento por ID

```
GET /agendamentos/:id
Authorization: Bearer <TOKEN>
```

Retorna o agendamento com dados completos do cliente e do passeio.

### 4.3 Criar agendamento

```
POST /agendamentos
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "clienteId": 1,
  "passeioId": 1
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `clienteId` | number | ✅ | ID do cliente (já cadastrado) |
| `passeioId` | number | ✅ | ID do passeio |

**Validações automáticas:**
- ✅ Cliente deve existir
- ✅ Passeio deve existir
- ✅ Passeio não pode estar lotado (vagas ocupadas < capacidade)
- ✅ Cliente não pode ter agendamento ativo (não cancelado) no mesmo passeio

**Resposta (201):** O agendamento criado com status `PENDENTE`.

**Regras de perfil:** ADMIN ou REDATOR.

### 4.4 Alterar status do agendamento

```
PATCH /agendamentos/:id/status
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "status": "CONFIRMADO"
}
```

| Status | Descrição |
|---|---|
| `PENDENTE` | Aguardando confirmação (status inicial) |
| `CONFIRMADO` | Agendamento confirmado |
| `CANCELADO` | Agendamento cancelado |
| `REMARCADO` | Cliente reagendou |

**Resposta (200):** O agendamento atualizado.

**Regras de perfil:** ADMIN ou REDATOR.

### 4.5 Deletar agendamento

```
DELETE /agendamentos/:id
Authorization: Bearer <TOKEN>
```

**Regras de perfil:** ADMIN ou REDATOR.

---

## 5. Endpoints de Avaliações

> Base: `http://localhost:3000/avaliacoes`

### 5.1 Listar avaliações

```
GET /avaliacoes
Authorization: Bearer <TOKEN>
```

Retorna todas as avaliações com dados do cliente e do passeio.

### 5.2 Buscar avaliação por ID

```
GET /avaliacoes/:id
Authorization: Bearer <TOKEN>
```

### 5.3 Criar avaliação

```
POST /avaliacoes
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "nota": 5,
  "comentario": "Passeio incrível!",
  "clienteId": 1,
  "passeioId": 1
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nota` | number (1-5) | ✅ | Avaliação do passeio |
| `comentario` | string | ❌ | Texto livre |
| `clienteId` | number | ✅ | ID do cliente |
| `passeioId` | number | ✅ | ID do passeio |

**Validações:**
- Nota entre 1 e 5
- Cliente e passeio devem existir
- Cliente não pode avaliar o mesmo passeio duas vezes

**Regras de perfil:** ADMIN ou REDATOR.

### 5.4 Atualizar avaliação

```
PUT /avaliacoes/:id
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "nota": 4,
  "comentario": "Muito bom, voltei para editar!"
}
```

Ambos os campos são opcionais.

**Regras de perfil:** ADMIN ou REDATOR.

### 5.5 Deletar avaliação

```
DELETE /avaliacoes/:id
Authorization: Bearer <TOKEN>
```

**Regras de perfil:** ADMIN ou REDATOR.

---

## 6. Endpoints de Usuários (Admin)

> Base: `http://localhost:3000/usuarios`
>
> 🔐 **Acesso exclusivo a ADMIN**

### 6.1 Listar usuários

```
GET /usuarios
Authorization: Bearer <TOKEN>
```

Retorna todos os usuários cadastrados (sem senha), com contagem de passeios.

### 6.2 Buscar usuário por ID

```
GET /usuarios/:id
Authorization: Bearer <TOKEN>
```

Retorna o usuário com seus passeios.

### 6.3 Alterar perfil de usuário

```
PATCH /usuarios/:id/perfil
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "perfil": "REDATOR"
}
```

| Valor | Descrição |
|---|---|
| `USUARIO` | Associado comum (vagoneteiro) |
| `ADMIN` | Administrador total |
| `REDATOR` | Pode gerenciar conteúdo e agendamentos |

### 6.4 Deletar usuário

```
DELETE /usuarios/:id
Authorization: Bearer <TOKEN>
```

⚠️ Não permite auto-deleção. Remove o usuário, mas preserva agendamentos vinculados a clientes.

---

## 7. Fluxos Completos

### 7.1 Fluxo de agendamento completo (admin/redator)

```
1. GET /clientes ── verificar se cliente já existe
   ├── Se não: POST /clientes ── cadastrar cliente
   └── Se sim: usar clienteId retornado

2. GET /passeios ── listar passeios disponíveis

3. POST /agendamentos { clienteId, passeioId }
   └── Retorna agendamento com status PENDENTE

4. PATCH /agendamentos/:id/status { "status": "CONFIRMADO" }
   └── Confirmar o agendamento

5. (Opcional) POST /avaliacoes { nota, clienteId, passeioId }
   └── Registrar avaliação do cliente após o passeio
```

### 7.2 Fluxo de criação de passeio (vagoneteiro)

```
1. POST /auth/login { identifier, senha }
   └── Obter token

2. POST /passeios { valor, capacidade, data }
   └── Passeio vinculado ao vagoneteiro logado

3. GET /passeios ── visualizar passeios criados

4. PUT /passeios/:id ── editar (só os próprios)

5. DELETE /passeios/:id ── deletar (só os próprios)
```

### 7.3 Fluxo de gerenciamento de usuários (admin)

```
1. GET /usuarios ── listar todos os usuários

2. PATCH /usuarios/:id/perfil { "perfil": "REDATOR" }
   └── Promover um USUARIO a REDATOR

3. DELETE /usuarios/:id
   └── Remover usuário (exceto a si mesmo)
```

---

## 8. Boas Práticas para o Frontend

### 8.1 Autenticação global

Crie um wrapper de fetch que injeta o token automaticamente e trata 401:

```typescript
const API_URL = 'http://localhost:3000';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('@Vagoneteiros:token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('@Vagoneteiros:token');
    localStorage.removeItem('@Vagoneteiros:user');
    window.location.href = '/entrar';
    throw new Error('Sessão expirada');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
```

### 8.2 Cache e estado local

- Após criar/editar/deletar um recurso, **recarregue a lista** do backend em vez de manipular o estado local — garante consistência
- Para performance, considere cache temporário (ex: React Query, SWR) com invalidação automática após mutações

### 8.3 Datas (⚠️ Atenção!)

O backend armazena datas no formato **UTC** (`2026-07-25T12:00:00.000Z`). O frontend precisa converter:

```typescript
// Para exibir:
new Date(data).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

// Para enviar ao backend (a partir de input datetime-local):
function toISOFromLocal(datetimeLocal: string): string {
  // datetimeLocal = "2026-07-25T09:00"
  return new Date(datetimeLocal + ':00-03:00').toISOString();
}
```

### 8.4 Controle de UI por perfil

| Perfil | Pode ver | Pode criar/editar/deletar |
|---|---|---|
| `USUARIO` | Passeios próprios | Passeios próprios |
| `REDATOR` | Tudo | Passeios, Clientes, Agendamentos, Avaliações |
| `ADMIN` | Tudo | Tudo (inclusive Usuários) |

No frontend, use o campo `user.perfil` para mostrar/ocultar botões e abas:

```tsx
{['ADMIN', 'REDATOR'].includes(user.perfil) && (
  <button onClick={criarPasseio}>Novo Passeio</button>
)}

{user.perfil === 'ADMIN' && (
  <button onClick={gerenciarUsuarios}>Gerenciar Usuários</button>
)}
```

Lembre-se: isso é apenas **cosmético**. A segurança real está no backend.

### 8.5 Tratamento de erros

Os endpoints retornam erros sempre no formato:

```json
{ "message": "Descrição do erro" }
```

Erros comuns para tratar no frontend:

| Status | Causa | Ação |
|---|---|---|
| 400 | Dados inválidos (ex: CPF com 10 dígitos) | Exibir mensagem ao usuário |
| 401 | Token ausente/expirado | Redirecionar para login |
| 403 | Perfil sem permissão | Esconder botão/rota |
| 404 | Recurso não encontrado | Exibir "não encontrado" |
| 500 | Erro interno do servidor | Exibir mensagem genérica |

---

## 9. Exemplos Práticos

### 9.1 React — Lista de passeios

```tsx
import { useState, useEffect } from 'react';

interface Passeio {
  id: number;
  valor: string;
  capacidade: number;
  data: string;
  usuario: { name: string };
  _count: { agendamentos: number; avaliacoes: number };
}

function ListaPasseios() {
  const [passeios, setPasseios] = useState<Passeio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Passeio[]>('/passeios')
      .then(setPasseios)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando...</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Valor</th>
          <th>Vagas</th>
          <th>Vagoneteiro</th>
          <th>Agendamentos</th>
        </tr>
      </thead>
      <tbody>
        {passeios.map((p) => (
          <tr key={p.id}>
            <td>{new Date(p.data).toLocaleString('pt-BR')}</td>
            <td>R$ {Number(p.valor).toFixed(2)}</td>
            <td>{p.capacidade}</td>
            <td>{p.usuario.name}</td>
            <td>{p._count.agendamentos}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 9.2 React — Formulário de novo agendamento

```tsx
async function criarAgendamento(clienteId: number, passeioId: number) {
  const data = await apiFetch('/agendamentos', {
    method: 'POST',
    body: JSON.stringify({ clienteId, passeioId }),
  });
  // data = { id, clienteId, passeioId, status: "PENDENTE", ... }
  return data;
}

// Uso no formulário:
<form onSubmit={async (e) => {
  e.preventDefault();
  try {
    await criarAgendamento(clienteId, passeioId);
    alert('Agendamento criado!');
    // recarregar lista
  } catch (err: any) {
    alert(err.message); // ex: "Passeio lotado"
  }
}}>
  {/* selects para cliente e passeio */}
</form>
```

### 9.3 Gerenciamento de status

```tsx
async function alterarStatus(agendamentoId: number, novoStatus: string) {
  return apiFetch(`/agendamentos/${agendamentoId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: novoStatus }),
  });
}

// No componente:
<select
  value={agendamento.status}
  onChange={(e) => alterarStatus(agendamento.id, e.target.value)}
>
  <option value="PENDENTE">Pendente</option>
  <option value="CONFIRMADO">Confirmado</option>
  <option value="CANCELADO">Cancelado</option>
  <option value="REMARCADO">Remarcado</option>
</select>
```

---

## 10. Checklist de Integração

### 🔐 Autenticação
- [ ] Login consome `POST /auth/login` com `{ identifier, senha }`
- [ ] Token armazenado em `localStorage` ou `sessionStorage`
- [ ] Header `Authorization: Bearer <TOKEN>` enviado em todas as requisições
- [ ] Redirecionamento automático para login ao receber `401`
- [ ] Logout limpa o storage
- [ ] Na inicialização da aplicação, validar token via `GET /auth/me`

### 🚂 Passeios
- [ ] Listagem de passeios: `GET /passeios`
- [ ] Criação: `POST /passeios` com `{ valor, capacidade, data }`
- [ ] Edição: `PUT /passeios/:id`
- [ ] Exclusão: `DELETE /passeios/:id`
- [ ] Controle: USUARIO edita só os próprios; ADMIN/REDATOR editam todos

### 👤 Clientes
- [ ] Listagem: `GET /clientes`
- [ ] Cadastro: `POST /clientes` com `{ nome, cpf, telefone, email? }`
- [ ] Edição: `PUT /clientes/:id`
- [ ] Exclusão: `DELETE /clientes/:id`
- [ ] Acesso: apenas ADMIN e REDATOR

### 📅 Agendamentos
- [ ] Listagem: `GET /agendamentos` (com dados do cliente + passeio)
- [ ] Criação: `POST /agendamentos` com `{ clienteId, passeioId }`
- [ ] Mudança de status: `PATCH /agendamentos/:id/status`
- [ ] Exclusão: `DELETE /agendamentos/:id`
- [ ] Validação de lotação tratada no frontend (exibir vagas restantes)

### ⭐ Avaliações
- [ ] Listagem: `GET /avaliacoes`
- [ ] Criação: `POST /avaliacoes` com `{ nota, comentario?, clienteId, passeioId }`
- [ ] Nota limitada a 1-5 (exibir estrelas no frontend)
- [ ] Edição: `PUT /avaliacoes/:id`
- [ ] Exclusão: `DELETE /avaliacoes/:id`

### 🔐 Usuários (Admin)
- [ ] Listagem: `GET /usuarios`
- [ ] Mudança de perfil: `PATCH /usuarios/:id/perfil`
- [ ] Exclusão: `DELETE /usuarios/:id`
- [ ] Acesso exclusivo a ADMIN
- [ ] Opção de "promover" usuário a REDATOR ou ADMIN

### 🌐 Geral
- [ ] Datas convertidas corretamente (UTC ↔ local)
- [ ] Tratamento de erros consistente (try/catch + feedback ao usuário)
- [ ] Loading state durante requisições
- [ ] Botões de ação desabilitados para perfis sem permissão
- [ ] Recarregar listas após criar/editar/deletar
- [ ] Responsividade para mobile
