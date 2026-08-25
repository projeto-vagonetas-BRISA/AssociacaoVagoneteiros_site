# Documentação Técnica — Sistema de Autenticação JWT

> Stack do backend: **Node.js · TypeScript · Express 5 · Prisma 6 · bcrypt · jsonwebtoken**

---

## Parte 1 — Backend

### 1.1 Dependências instaladas

```bash
# Dependências de produção
npm install express @prisma/client bcrypt jsonwebtoken dotenv

# Dependências de desenvolvimento
npm install -D prisma typescript ts-node nodemon \
  @types/express @types/bcrypt @types/jsonwebtoken @types/node
```

Pacotes relevantes para o fluxo de autenticação:

| Pacote | Função |
|---|---|
| `bcrypt` | Hash e comparação de senhas |
| `jsonwebtoken` | Geração e verificação de tokens JWT |
| `@prisma/client` | ORM para acesso ao banco PostgreSQL |
| `dotenv` | Leitura de variáveis de ambiente |

---

### 1.2 Variáveis de ambiente (`.env`)

```dotenv
DATABASE_URL="postgresql://usuario:senha@host:5432/banco"
JWT_SECRET="segredo_forte_e_longo_aqui"
```

> **Nunca** commitar o `.env` real. O `.env.example` com valores fictícios serve de documentação para a equipe.

---

### 1.3 Schema Prisma — modelo `Usuario`

Arquivo: `prisma/schema.prisma`

```prisma
model Usuario {
  id              Int      @id @default(autoincrement())
  name            String
  cpf             String   @unique
  historico       String?
  email           String?  @unique
  telefone        String
  senha           String           // armazena SOMENTE o hash bcrypt
  perfil          Perfil   @default(USUARIO)
  data_associacao DateTime @default(now())
  foto            Bytes?
  passeios        Passeio[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum Perfil {
  USUARIO
  ADMIN
  REDATOR
}
```

O campo `senha` **nunca** recebe a senha em texto plano — somente o hash gerado pelo bcrypt.

Após alterar o schema, gerar e aplicar a migration:

```bash
npx prisma migrate dev --name add_usuario
```

---

### 1.4 Cliente Prisma singleton

Arquivo: `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
```

Manter uma única instância do `PrismaClient` evita o esgotamento do pool de conexões.

---

### 1.5 Utilitário JWT

Arquivo: `src/utils/jwt.ts`

```typescript
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_padrao_vagoneteiros_2026';

export interface TokenPayload {
  id: number;
  cpf: string;
  email: string | null;
  perfil: string;
}

// Assina o token com expiração de 24 horas
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// Lança exceção se o token for inválido ou expirado
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
```

O payload do token contém apenas dados não sensíveis: `id`, `cpf`, `email` e `perfil`. A senha **nunca** entra no payload.

---

### 1.6 Middleware de autenticação

Arquivo: `src/middlewares/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { Usuario } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import prisma from '../lib/prisma';

// Extende o tipo Request do Express para carregar o usuário autenticado
export interface AuthenticatedRequest extends Request {
  user?: Omit<Usuario, 'senha'>;
}

/**
 * authMiddleware
 * Valida o Bearer Token no header Authorization.
 * Injeta req.user com os dados atualizados do banco (sem senha).
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  // 1. Verificar presença do header
  if (!authHeader) {
    res.status(401).json({ message: 'Token de autenticação ausente' });
    return;
  }

  const parts = authHeader.split(' ');

  // 2. Verificar formato "Bearer <TOKEN>"
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ message: 'Token malformatado. Use o formato: Bearer <TOKEN>' });
    return;
  }

  const token = parts[1];

  try {
    // 3. Verificar assinatura e expiração
    const decoded = verifyToken(token);

    // 4. Buscar o usuário no banco (valida que ainda existe e pega dados frescos)
    const usuario = await prisma.usuario.findUnique({ where: { id: decoded.id } });

    if (!usuario) {
      res.status(401).json({ message: 'Usuário não encontrado' });
      return;
    }

    // 5. Injetar usuário sem a senha no objeto de requisição
    const { senha, ...usuarioSemSenha } = usuario;
    req.user = usuarioSemSenha;

    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}

/**
 * roleMiddleware
 * Deve ser usado APÓS authMiddleware.
 * Restringe o acesso a perfis específicos.
 *
 * Exemplo de uso: router.delete('/admin', authMiddleware, roleMiddleware(['ADMIN']), handler)
 */
export function roleMiddleware(allowedRoles: ('USUARIO' | 'ADMIN' | 'REDATOR')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Não autorizado' });
      return;
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      res.status(403).json({ message: 'Acesso negado: permissão insuficiente' });
      return;
    }

    next();
  };
}
```

---

### 1.7 Controller de autenticação

Arquivo: `src/controllers/authController.ts`

#### Funções auxiliares internas

```typescript
// Remove pontuação do CPF: "123.456.789-09" → "12345678909"
function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// Valida formato de e-mail simples
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

#### `POST /auth/register` — Cadastro de novo usuário

```typescript
export async function cadastro(req: Request, res: Response): Promise<void> {
  const { name, cpf, senha, email, telefone, historico } = req.body;

  // Validações de entrada
  if (!name || !cpf || !senha || !telefone)
    return res.status(400).json({ message: 'Nome, CPF, Senha e Telefone são obrigatórios' });

  const cleanedCpf = cleanCPF(cpf);
  if (cleanedCpf.length !== 11)
    return res.status(400).json({ message: 'CPF inválido. Deve conter 11 dígitos' });

  if (senha.length < 6)
    return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });

  if (email && !isValidEmail(email))
    return res.status(400).json({ message: 'Formato de e-mail inválido' });

  // Unicidade de CPF e e-mail
  if (await prisma.usuario.findUnique({ where: { cpf: cleanedCpf } }))
    return res.status(400).json({ message: 'Este CPF já está cadastrado' });

  if (email && await prisma.usuario.findUnique({ where: { email } }))
    return res.status(400).json({ message: 'Este E-mail já está cadastrado' });

  // Hash da senha (custo 10 = ~100ms, bom equilíbrio segurança/performance)
  const hashedSenha = await bcrypt.hash(senha, 10);

  // Persistir usuário
  const novoUsuario = await prisma.usuario.create({
    data: { name, cpf: cleanedCpf, senha: hashedSenha, email: email || null, telefone, historico: historico || null, perfil: 'USUARIO' },
  });

  // Gerar token para login automático pós-cadastro
  const token = generateToken({ id: novoUsuario.id, cpf: novoUsuario.cpf, email: novoUsuario.email, perfil: novoUsuario.perfil });

  const { senha: _, ...usuarioSemSenha } = novoUsuario;

  res.status(201).json({ message: 'Usuário cadastrado com sucesso', token, user: usuarioSemSenha });
}
```

#### `POST /auth/login` — Autenticação

```typescript
export async function login(req: Request, res: Response): Promise<void> {
  const { identifier, senha } = req.body;
  // identifier pode ser CPF (com ou sem formatação) ou e-mail

  if (!identifier || !senha)
    return res.status(400).json({ message: 'CPF/E-mail e senha são obrigatórios' });

  const cleanedIdentifier = cleanCPF(identifier);
  let usuario = null;

  // Estratégia: tenta CPF primeiro, depois e-mail
  if (cleanedIdentifier.length === 11)
    usuario = await prisma.usuario.findUnique({ where: { cpf: cleanedIdentifier } });

  if (!usuario && isValidEmail(identifier))
    usuario = await prisma.usuario.findUnique({ where: { email: identifier } });

  if (!usuario)
    usuario = await prisma.usuario.findUnique({ where: { email: identifier } });

  // Mesmo erro para "usuário não encontrado" e "senha errada" (evita enumeração)
  if (!usuario)
    return res.status(401).json({ message: 'CPF/E-mail ou senha incorretos' });

  const matches = await bcrypt.compare(senha, usuario.senha);
  if (!matches)
    return res.status(401).json({ message: 'CPF/E-mail ou senha incorretos' });

  const token = generateToken({ id: usuario.id, cpf: usuario.cpf, email: usuario.email, perfil: usuario.perfil });
  const { senha: _, ...usuarioSemSenha } = usuario;

  res.status(200).json({ message: 'Login realizado com sucesso', token, user: usuarioSemSenha });
}
```

#### `GET /auth/me` — Dados do usuário autenticado

```typescript
export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user)
    return res.status(401).json({ message: 'Não autenticado' });

  res.status(200).json({ user: req.user });
}
```

Esta rota é protegida pelo `authMiddleware` e retorna os dados frescos do banco (injetados em `req.user`).

---

### 1.8 Rotas de autenticação

Arquivo: `src/routes/authRoutes.ts`

```typescript
import { Router } from 'express';
import { cadastro, login, me } from '../controllers/authController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', cadastro);            // Público
router.post('/login', login);                  // Público
router.get('/me', authMiddleware, me);         // Protegido

export default router;
```

Arquivo: `src/routes/index.ts`

```typescript
import { Router } from 'express';
import authRoutes from './authRoutes';

const router = Router();

router.use('/auth', authRoutes);  // Prefixo: /auth/login, /auth/register, /auth/me

export default router;
```

---

### 1.9 CORS — liberação do frontend

Arquivo: `src/app.ts`

```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // origem do frontend
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {   // preflight
    res.sendStatus(200);
    return;
  }
  next();
});
```

> Em produção, substituir `http://localhost:5173` pela URL real do frontend.

---

### 1.10 Fluxo completo resumido

```
Cliente                         Backend
  │                                │
  ├─ POST /auth/login ─────────────►
  │   { identifier, senha }        │
  │                                ├─ cleanCPF(identifier)
  │                                ├─ prisma.usuario.findUnique(...)
  │                                ├─ bcrypt.compare(senha, hash)
  │                                ├─ jwt.sign({ id, cpf, email, perfil }, secret, { expiresIn: '24h' })
  │◄────────── 200 OK ─────────────┤
  │   { token, user }              │
  │                                │
  ├─ GET /auth/me ─────────────────►
  │   Authorization: Bearer <JWT>  │
  │                                ├─ jwt.verify(token, secret)
  │                                ├─ prisma.usuario.findUnique({ id: decoded.id })
  │                                ├─ req.user = usuarioSemSenha
  │◄────────── 200 OK ─────────────┤
  │   { user }                     │
```

---

### 1.11 Protegendo outras rotas

Para proteger qualquer rota futura, basta encadear os middlewares:

```typescript
// Apenas usuário autenticado
router.get('/perfil', authMiddleware, perfilController.show);

// Apenas ADMIN
router.delete('/usuario/:id', authMiddleware, roleMiddleware(['ADMIN']), usuarioController.delete);

// ADMIN ou REDATOR
router.post('/passeio', authMiddleware, roleMiddleware(['ADMIN', 'REDATOR']), passeioController.create);
```

---

## Parte 2 — Frontend

> Esta seção é agnóstica de framework. Os exemplos usam JavaScript puro com `fetch`. Adapte conforme React, Vue, Angular ou outro framework utilizado.

---

### 2.1 Recepção do token (após login/cadastro)

Após uma chamada bem-sucedida a `POST /auth/login` ou `POST /auth/register`, a API retorna:

```json
{
  "message": "Login realizado com sucesso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "name": "Roberto", "cpf": "...", "perfil": "USUARIO", ... }
}
```

Exemplo de chamada:

```javascript
async function login(identifier, senha) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, senha }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message);
  }

  const data = await response.json();
  return data; // { token, user }
}
```

---

### 2.2 Persistência do token

#### Opção A — `localStorage` (mais simples, vulnerável a XSS)

```javascript
function salvarSessao(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function recuperarToken() {
  return localStorage.getItem('token');
}

function recuperarUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
```

> **Atenção**: qualquer script injetado na página pode ler o `localStorage`. Nunca armazene dados sensíveis adicionais além do token.

#### Opção B — `sessionStorage` (token some ao fechar a aba)

```javascript
function salvarSessao(token, user) {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user', JSON.stringify(user));
}
```

Prefira `sessionStorage` quando a sessão não precisar persistir entre abas ou reinicializações do browser.

#### Opção C — Cookie `HttpOnly` (mais seguro, requer suporte do backend)

Nesta abordagem, o backend envia o token em um cookie `HttpOnly`, que o browser gerencia automaticamente e scripts JS **não conseguem** acessar.

```
Set-Cookie: token=<JWT>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400
```

No frontend, basta incluir `credentials: 'include'` nas requisições:

```javascript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  credentials: 'include', // envia e recebe cookies automaticamente
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier, senha }),
});
```

> O backend atual retorna o token no corpo JSON (Opções A/B). A Opção C exigiria mudanças no backend.

---

### 2.3 Utilização do token em requisições protegidas

Todo request a rotas protegidas deve incluir o header `Authorization: Bearer <TOKEN>`:

```javascript
async function fetchComAuth(url, options = {}) {
  const token = localStorage.getItem('token'); // ou sessionStorage

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  // Token expirado ou inválido — redirecionar para login
  if (response.status === 401) {
    destruirSessao();
    window.location.href = '/login';
    return;
  }

  return response;
}

// Exemplo: buscar dados do usuário autenticado
async function carregarPerfil() {
  const response = await fetchComAuth('http://localhost:3000/auth/me');
  const data = await response.json();
  console.log(data.user);
}
```

---

### 2.4 Verificação de sessão ativa (ao carregar a aplicação)

Ao iniciar a SPA ou recarregar a página, verifique se o token ainda é válido **antes** de renderizar rotas protegidas:

```javascript
async function verificarSessao() {
  const token = localStorage.getItem('token');

  if (!token) {
    return false; // não há sessão
  }

  // Verificação via backend (garante que o usuário ainda existe no banco)
  const response = await fetch('http://localhost:3000/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    destruirSessao(); // token inválido/expirado → limpar storage
    return false;
  }

  const { user } = await response.json();
  // Opcional: atualizar estado global com os dados frescos do usuário
  return user;
}

// Uso na inicialização da aplicação
(async () => {
  const user = await verificarSessao();
  if (user) {
    renderizarAppAutenticado(user);
  } else {
    renderizarTelaDeLogin();
  }
})();
```

---

### 2.5 Controle de acesso por perfil no frontend

O objeto `user` retornado pela API contém o campo `perfil` (`USUARIO`, `ADMIN`, `REDATOR`). Use-o para controle visual de UI:

```javascript
function podeCriarPasseio(user) {
  return ['ADMIN', 'REDATOR'].includes(user.perfil);
}

function podeExcluirUsuario(user) {
  return user.perfil === 'ADMIN';
}

// Exemplo com renderização condicional
if (podeCriarPasseio(user)) {
  document.getElementById('btn-novo-passeio').style.display = 'block';
}
```

> **Importante**: o controle de perfil no frontend é apenas visual. A autorização real acontece no backend via `roleMiddleware`. Nunca confie apenas no frontend para controlar acesso.

---

### 2.6 Destruição da sessão (logout)

```javascript
function destruirSessao() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Se usar sessionStorage:
  // sessionStorage.removeItem('token');
  // sessionStorage.removeItem('user');
}

async function logout() {
  // Notificar o backend (boa prática, mesmo sem blacklist de token)
  // Se o backend implementar blacklist/refresh tokens no futuro, esta chamada já estará pronta
  try {
    await fetchComAuth('http://localhost:3000/auth/logout', { method: 'POST' });
  } catch {
    // silenciar erros de rede no logout
  }

  destruirSessao();
  window.location.href = '/login'; // redirecionar para tela de login
}
```

> O token JWT é **stateless** — o backend não mantém lista de tokens ativos. O logout do lado cliente (remover do storage) é suficiente para a implementação atual. Para invalidação real no servidor, seria necessário implementar uma blacklist ou tokens de refresh.

---

### 2.7 Ciclo de vida completo da sessão

```
Usuário                 Frontend                     Backend
   │                       │                             │
   ├──── digita credenciais ►                            │
   │                       ├── POST /auth/login ─────────►
   │                       │                             ├── verifica senha (bcrypt)
   │                       │                             ├── gera JWT (24h)
   │                       │◄─── { token, user } ────────┤
   │                       ├── localStorage.setItem(token)│
   │                       ├── atualiza estado global     │
   │◄── renderiza app ──────┤                            │
   │                       │                             │
   │   (navega por rotas    │                             │
   │    protegidas)         │                             │
   │                       ├── GET /rota-protegida ───────►
   │                       │   Authorization: Bearer JWT  │
   │                       │                             ├── verifica JWT
   │                       │                             ├── busca usuário no banco
   │                       │◄─── 200 { dados } ──────────┤
   │◄── exibe conteúdo ─────┤                            │
   │                       │                             │
   │   (token expira        │                             │
   │    após 24h)           │                             │
   │                       ├── GET /rota-protegida ───────►
   │                       │   Authorization: Bearer JWT  │
   │                       │                             ├── jwt.verify → expira!
   │                       │◄─── 401 Unauthorized ───────┤
   │                       ├── destruirSessao()           │
   │◄── redireciona /login ─┤                            │
   │                       │                             │
   │   (clica em Sair)      │                             │
   │                       ├── destruirSessao()           │
   │◄── redireciona /login ─┤                            │
```

---

### 2.8 Checklist de segurança

- [ ] Nunca logar ou exibir o token JWT em console/UI
- [ ] Nunca armazenar a senha do usuário no frontend (nem no estado, nem no storage)
- [ ] Sempre usar HTTPS em produção para proteger o token em trânsito
- [ ] Tratar respostas 401 globalmente (wrapper `fetchComAuth`) para logout automático
- [ ] Controle de perfil no frontend é apenas UI — a autorização real é sempre no backend
- [ ] Definir o CORS do backend para a origem exata do frontend em produção
- [ ] Preferir `sessionStorage` se a sessão não precisa sobreviver ao fechamento do browser
- [ ] Considerar tokens de refresh para sessões de longa duração sem relogin
