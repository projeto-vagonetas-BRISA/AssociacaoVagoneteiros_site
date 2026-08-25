# Pauta: Sistema de Status de Agendamento

> Gerado em 2026-07-09 — para discussão com equipe e cliente.
> Objetivo: esclarecer todas as regras de negócio antes de codificar.

---

## 1️⃣ O que já está implementado

### Backend (pronto)

**Schema / Banco:**
```prisma
enum StatusAgendamento {
  PENDENTE      // ← valor padrão ao criar agendamento
  CONFIRMADO
  CANCELADO
  REMARCADO     // ← sugestão: excluir
}
```

**Rotas:**
| Método | Rota | Proteção | Descrição |
|---|---|---|---|
| `GET` | `/agendamentos` | Autenticado | Lista todos os agendamentos |
| `GET` | `/agendamentos/:id` | Autenticado | Detalhe de um agendamento |
| `POST` | `/agendamentos/publico` | Público | Cria agendamento (status = PENDENTE) |
| `PATCH` | `/agendamentos/:id/status` | ADMIN/REDATOR | Altera status para qualquer valor válido |
| `POST` | `/agendamentos` | ADMIN/REDATOR | Cria agendamento manual |
| `DELETE` | `/agendamentos/:id` | ADMIN/REDATOR | Exclui agendamento |

**Controller `atualizarStatus`:**
- Aceita qualquer transição (PENDENTE → CONFIRMADO, CONFIRMADO → CANCELADO, etc.)
- **NÃO valida** regras de transição (ex: impede CONFIRMADO → PENDENTE?)
- **NÃO recalcula** vagas ao cancelar
- **NÃO dispara** notificações

**Controller `agendarPublico`:**
- Cria cliente se não existir (por telefone/email/documento)
- Cria agendamento com `status: PENDENTE`
- **NÃO valida** vagas no momento da criação

### Frontend (pronto)

**Painel Admin (`PainelAdm.tsx`):**
- Exibe status com badges coloridas:
  - `PENDENTE` → badge âmbar
  - `CONFIRMADO` → badge azul
  - `CANCELADO` → badge vermelho
  - `REMARCADO` → badge roxo
- Filtro por status (select com TODOS, CONFIRMADO, PENDENTE, CANCELADO, REMARCADO, ANDAMENTO)
- Filtro "ANDAMENTO" = CONFIRMADO + PENDENTE
- Conta agendamentos não cancelados para vagas ocupadas
- **NÃO tem** botões de Confirmar/Cancelar — só exibe

**Formulário de Agendamento (`Agendamento.tsx`):**
- Cria agendamento via `POST /agendamentos/publico`
- Exibe histórico de agendamentos do cliente
- **NÃO mostra** badge de status no histórico — só lista as datas

---

## 2️⃣ Decisões de Negócio Pendentes

### 2.1 — Quais status existem?

```
Situação atual: PENDENTE | CONFIRMADO | CANCELADO | REMARCADO
Proposta:        PENDENTE | CONFIRMADO | CANCELADO
                                                  (+ REALIZADO como regra, não como status)
```

| Status | Proposta | Motivo |
|---|---|---|
| `PENDENTE` | ✅ Manter | Padrão na criação |
| `CONFIRMADO` | ✅ Manter | Admin confirma |
| `CANCELADO` | ✅ Manter | Admin cancela |
| `REMARCADO` | ❌ **Excluir** | Cliente cancela e faz novo agendamento |
| `REALIZADO` | 🔷 **Implícito** | Regra: `status !== CANCELADO && data_passeio + horario < now()` |

**❓ Perguntas para a reunião:**
- Concorda em remover REMARCADO?
- REALIZADO implícito é suficiente ou precisa de um status salvo?
- Precisa de mais algum status? (ex: `AUSENTE` se o cliente não aparecer)

---

### 2.2 — Fluxo de transições

```
                    ┌──────────┐
                    │ PENDENTE │  ← cliente agendou
                    └────┬─────┘
                         │ admin CONFIRMA
                    ┌────▼──────┐
                    │ CONFIRMADO │
                    └────┬───────┘
                         │ data + horário já passaram
                    ┌────▼──────────┐
                    │ ✅ REALIZADO  │  ← implícito, pode avaliar
                    └───────────────┘

     CANCELADO ◀───────┴───────▶ CANCELADO
    (admin a qualquer momento)   (admin a qualquer momento)
```

**Transições permitidas:**
| De | Para | Quem | Observação |
|---|---|---|---|
| PENDENTE | CONFIRMADO | Admin/Redator | — |
| PENDENTE | CANCELADO | Admin/Redator | vaga é liberada |
| CONFIRMADO | CANCELADO | Admin/Redator | vaga é liberada |
| CONFIRMADO | (REALIZADO) | Automático | data passou, sem ação manual |
| CANCELADO | ❌ | Ninguém | estado terminal |

**❓ Perguntas:**
- Admin pode reverter um CANCELADO? (ex: cliente desistiu mas voltou atrás)
- Se reverter, volta pra PENDENTE ou CONFIRMADO?
- Agendamento PENDENTE vence (vira CANCELADO automático) após X horas/dias sem confirmação?

---

### 2.3 — Quem pode confirmar?

**Proposta:**
| Ação | Quem pode |
|---|---|
| Confirmar (PENDENTE → CONFIRMADO) | `ADMIN` ou `REDATOR` |
| Cancelar (PENDENTE → CANCELADO) | `ADMIN` ou `REDATOR` |
| Cancelar (CONFIRMADO → CANCELADO) | `ADMIN` ou `REDATOR` |

**❓ Perguntas:**
- O **vagoneteiro** pode confirmar/cancelar agendamentos do próprio passeio?
  - (Docs: "vagoneteiro vê quem está com vagoneta")
  - Ou vagoneteiro só **visualiza** e admin/redator que executa?
- O **cliente** pode cancelar o próprio agendamento?
  - Se sim: como? (WhatsApp? Link no e-mail? Tela de login?)
  - Se não: quem absorve o contato do cliente?
- O **cliente** pode confirmar? (ex: "confirme seu e-mail")
  - Ou confirmação é só interna (admin)?

---

### 2.4 — Vagas e cancelamento (com regra de acompanhantes)

**Cenário atual:**
- Vagas disponíveis = `passeio.capacidade - agendamentos_não_cancelados`
- Ao criar agendamento: **não valida** vagas restantes (pode estourar)
- Acompanhantes são armazenados como número inteiro no campo `acompanhantes`

**Regra proposta (Roberto, 2026-07-09):**

Se um agendamento é **cancelado**, o cliente e **todos os seus acompanhantes** são cancelados juntos — a vaga total é liberada inteiramente.

> *Exemplo: Cliente A agendou para 5 pessoas (ele + 4 acompanhantes).
> Se o Cliente A cancela, as 5 vagas são liberadas de uma vez.
> Não faz sentido os acompanhantes manterem a vaga sem o cliente principal.*

**Impacto no cálculo de vagas ocupadas:**
```
vagas_ocupadas = SUM(1 + agendamento.acompanhantes)  // por agendamento não cancelado
vagas_disponiveis = passeio.capacidade - vagas_ocupadas
```

**❓ Perguntas para a reunião:**
- Ao criar agendamento, deve validar `1 + acompanhantes <= vagas_disponiveis`?
  - Se sim: o que acontece se estourar? (erro? lista de espera?)
- Ao cancelar: vaga de cliente + acompanhantes é liberada imediatamente?
- Deve ter **lista de espera**? Se alguém cancelar, o próximo da fila é notificado?

---

### 2.5 — Realizado e Avaliação

**Regra atual no backend (avaliação):**
- Só permite avaliar se o agendamento está `CONFIRMADO` OU `PENDENTE` E a data já passou

**Proposta (alinhada com REALIZADO implícito):**
- Pode avaliar se: `status !== CANCELADO && data_passeio + horario < now()`

**❓ Pergunta:**
- Quantos dias após a data do passeio o cliente ainda pode avaliar? (48h? 7 dias? Indeterminado?)

---

### 2.6 — Notificações

**Contexto dos docs:**
- TAP menciona "confirmação automática via e-mail ou WhatsApp"
- Equipe notou: "restrição financeira: não vamos usar API do WhatsApp"
- Sistema já coleta `consentimentoNotificacao` (checkbox no formulário)

**❓ Perguntas:**
- Confirmação/cancelamento gera **e-mail** para o cliente?
- Só envia para quem **consentiu** notificação?
- Cliente pode ser notificado sobre:
  - Agendamento criado (PENDENTE)?
  - Agendamento confirmado (CONFIRMADO)?
  - Agendamento cancelado?
  - Lembrete X horas antes do passeio?

---

### 2.7 — Visibilidade (quem vê o quê)

**❓ Perguntas:**
- **ADMIN** e **REDATOR**: veem todos os agendamentos (✅ já implementado)
- **VAGONETEIRO**: deve ver os agendamentos do próprio passeio?
  - Docs: "vagoneteiro vê quem está com vagoneta"
  - Se sim: visualizar ou também confirmar/cancelar?
- **CLIENTE (logado)**: deve ver o histórico com status dos próprios agendamentos?
  - Se sim: precisa de tela de login do cliente (ainda não implementada)
- **PÚBLICO (sem login)**: já vê o histórico no formulário de agendamento

---

### 2.8 — CPF vs CNPJ (já implementado, mas impacta)

- **CPF (pessoa física):** pode ter 1 agendamento por vez?
- **CNPJ (agência):** pode ter múltiplos agendamentos simultâneos?
- **❓ Pergunta:** Deve bloquear novo agendamento se CPF já tem um PENDENTE ou CONFIRMADO?

---

## 3️⃣ Resumo Técnico do que precisa ser codificado

### Depende das decisões acima:

| Item | Impacto | Prioridade |
|---|---|---|
| Remover `REMARCADO` do enum | Migration + schema | Média |
| Validar transições no backend (ex: CONFIRMADO não volta pra PENDENTE) | Controller `atualizarStatus` | Alta |
| Recalcular vagas ao cancelar | Controller `atualizarStatus` | Alta |
| Validar vagas ao criar agendamento | Controller `agendarPublico` | Alta |
| Badge de REALIZADO no frontend (implícito) | Componente de exibição | Média |
| Botões Confirmar/Cancelar no painel admin | PainelAdm.tsx | Alta |
| Notificações por e-mail | Backend + Nodemailer | Média |
| Filtro de status no histórico do cliente | Frontend | Baixa |
| Painel do vagoneteiro (ver agendamentos) | Backend + Frontend | Média |
| Bloqueio de múltiplos agendamentos por CPF | Controller `agendarPublico` | Média |

---

## 4️⃣ Checklist para a reunião

- [ ] Validar exclusão de `REMARCADO`
- [ ] Decidir se `REALIZADO` é implícito ou status no banco
- [ ] Definir todas as transições válidas (quem → pode fazer o quê)
- [ ] Definir se cliente pode cancelar sozinho
- [ ] Definir se vagoneteiro confirma/cancela ou só visualiza
- [ ] Definir PENDENTE expira (tempo máximo sem confirmação)
- [ ] Definir notificações (quais eventos, por qual canal)
- [ ] Definir validação de vagas (estoura ou lista de espera?)
- [ ] Definir bloqueio por CPF (1 agendamento por vez?)
- [ ] Definir prazo para avaliar após o passeio