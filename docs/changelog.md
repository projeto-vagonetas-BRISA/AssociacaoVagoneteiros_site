# Changelog — release/v1.0

> Documento de acompanhamento do desenvolvimento do branch `release/v1.0`.
> Gerado em 2026-07-09 — para envio à equipe.

---

## Índice

- [Infraestrutura](#infraestrutura)
- [Autenticação e Perfis](#autenticação-e-perfis)
- [CRUD Vagoneteiros](#crud-vagoneteiros)
- [CRUD Passeios](#crud-passeios)
- [Agendamento Público](#agendamento-público)
- [Avaliações](#avaliações)
- [Painel Administrativo](#painel-administrativo)
- [Melhorias de UX e Correções](#melhorias-de-ux-e-correções)
- [Documentação](#documentação)

---

## Infraestrutura

- Docker Compose com PostgreSQL e volume persistente (`vagoneteiros-pgdata`)
- Express 5 + Prisma 6 + TypeScript no backend
- React 19 + Vite 8 + Tailwind v4 no frontend
- CORS configurado com pacote `cors`
- Body parser com limite de 10mb para upload de fotos

## Autenticação e Perfis

- JWT com 3 perfis: `ADMIN`, `REDATOR`, `USUARIO`
- Rotas protegidas por middleware de autenticação e role
- Seed com usuários de teste:
  - ADMIN: CPF `000.000.000-00` / senha `admin123`
  - REDATOR: CPF `111.111.111-11` / senha `redator123`
  - USUARIO: CPF `222.222.222-22` / senha `vaga123`

## CRUD Vagoneteiros

- Cadastro completo com foto (upload base64, nome, CPF, telefone, experiência, data de associação)
- Listagem com paginação (9 por página)
- Edição inline com alteração de foto
- Soft-delete (toggle ativo/inativo com feedback visual)
- Perfil individual com informações do profissional
- Combobox de vagoneteiros no cadastro de passeios

## CRUD Passeios

- Criação de passeios com data, horário, capacidade e vagoneteiro vinculado
- Edição e desativação (soft-delete)
- Paginação (5 por página)
- Controle de vagas disponíveis baseado em agendamentos ativos
- Combobox de vagoneteiros no formulário

## Agendamento Público

- Formulário público de agendamento (sem necessidade de login)
- Seletor de data com calendário visual e indicação de dias com disponibilidade
- Horários do dia com vagas disponíveis em tempo real
- **Número de passageiros** com controle de vagas dinâmicas
- **Acompanhantes** integrados no payload
- **Consentimentos** (promoção, notificação, ciente) — conforme LGPD
- **Forma de pagamento** (Crédito, Débito, PIX, Dinheiro)
- **Modo Agência de Turismo** com toggle:
  - Campos: CNPJ, Nome da Agência, Telefone, E-mail
  - CNPJ aceito como documento (14 dígitos)
- **Busca automática por CPF/CNPJ:**
  - CPF/CNPJ como primeiro campo no formulário
  - Ao digitar 11 dígitos (CPF) ou 14 dígitos (CNPJ), busca automaticamente na base
  - Se encontrado, preenche nome, telefone e e-mail automaticamente
  - Se não encontrado, salva no banco ao finalizar o agendamento (próxima visita já preenche)
- Histórico de agendamentos paginado
- Cadastro automático de cliente (CPF, telefone ou email como identificador)
- Documento (CPF/CNPJ) salvo junto ao cliente para buscas futuras

## Avaliações

- Backend completo com validação: só clientes com agendamento confirmado e data passada podem avaliar
- CRUD de avaliações (criar, listar, buscar por passeio)

## Painel Administrativo

- Listagem de vagoneteiros com dados reais da API
- Toggle (ativar/desativar) com badge de status
- Links para perfil individual (verificar estilos)
- CRUD de passeios integrado
- Gestão de agendamentos (pendente — botões de Confirmar/Cancelar em breve)

## Melhorias de UX

- Ordem do formulário: Informações Pessoais → Calendário → Pagamento → Passageiros



---

## Pendentes para próximas sprints

- [ ] Integrar avaliações na Home (`Home.tsx`) — consumir `GET /avaliacoes` no lugar de dados mockados
- [ ] Migrar upload de fotos de Base64 para `multipart/form-data` (Multer)
- [ ] Diálogo de confirmação visual para exclusões no painel

- [ ] Sistema de status de agendamento (Confirmar/Cancelar no painel)

- [ ] Testes