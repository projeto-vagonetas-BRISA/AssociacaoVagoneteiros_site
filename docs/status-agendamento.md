# Sistema de Status de Agendamento — Rascunho de Decisões

> Gerado em 2026-07-09, pendente de validação com os docs do projeto.
> Levar para próxima reunião de definição de negócio.

---

## Enums Propostos

```prisma
enum StatusAgendamento {
  PENDENTE
  CONFIRMADO
  CANCELADO
  // REMARCADO → excluir (criar novo agendamento se o cliente quiser mudar a data)
}
```

## Fluxo

```
PENDENTE ──admin confirma──▶ CONFIRMADO ──data passou──▶ ✅ REALIZADO (implícito)
    │                            │
    └──admin cancela─────────▶ CANCELADO ◀──admin cancela──┘
```

- **REALIZADO** não é salvo no banco. É uma regra de negócio:
  `status !== CANCELADO && data_passeio + horario < now()`
- O filtro pra **avaliação** usa essa regra: só clientes com agendamento implicitamente realizado podem avaliar.

## Quem faz o quê

| Ação | Quem | Como |
|---|---|---|
| Confirmar | Admin / Redator | Botão no painel |
| Cancelar | Admin / Redator | Botão no painel |
| Realizado | Automático | Regra de data/hora |
| Avaliar | Cliente | Só se realizado |

## Pendências para próxima reunião

- [ ] Cliente pode cancelar sozinho? (WhatsApp?)
- [ ] PENDENTE expira após X horas sem confirmação?
- [ ] Notificar cliente quando admin confirma/cancela?
- [ ] Validar com os docs/requisitos do projeto