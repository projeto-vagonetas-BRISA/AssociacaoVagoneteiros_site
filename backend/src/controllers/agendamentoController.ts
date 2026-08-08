import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';
import { parseFiltroData } from '../utils/filtroData';
import { enviarEmailConfirmacaoAgendamento } from '../utils/email';
import { calculateNotificationTimes } from '../utils/notificationUtils';
import { calcularVagasDisponiveis } from '../services/vagas.service';

async function upsertPushSubscription(clienteId: number, token: string, userAgent?: string) {
  // Check (FCM token)
  const existingSubscription = await prisma.pushSubscription.findFirst({
    where: { clienteId },
  });

  if (existingSubscription) {
    // Update da subscription se o token mudou
    if (existingSubscription.token !== token) {
      return prisma.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          token,
          userAgent,
        },
      });
    }
    return existingSubscription;
  }

  // Se o usuário não tem subscription, cria uma nova
  return prisma.pushSubscription.create({
    data: {
      token,
      clienteId,
      userAgent,
    },
  });
}

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { inicio, fim } = req.query;

    const filtroDate = parseFiltroData(inicio as string, fim as string);
    const filtroData = filtroDate ? { passeio: { data: filtroDate } } : {};

    const agendamentos = await prisma.agendamento.findMany({
      where: Object.keys(filtroData).length > 0 ? filtroData : undefined,
      include: {
        cliente: { select: { id: true, nome: true, cpf: true } },
        passeio: {
          select: {
            id: true, data: true, preco: true, capacidade: true, horario: true,
            usuario: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agendamentos);
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error);
    res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
}

export async function buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nome: true, cpf: true, telefone: true, email: true } },
        passeio: {
          include: { usuario: { select: { id: true, name: true } } },
        },
      },
    });

    if (!agendamento) {
      res.status(404).json({ message: 'Agendamento não encontrado' });
      return;
    }

    res.json(agendamento);
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error);
    res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
}

export async function criar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { clienteId, passeioId, acompanhantes, notificacao, fcmToken } = req.body;

    if (!clienteId || !passeioId) {
      res.status(400).json({ message: 'clienteId e passeioId são obrigatórios' });
      return;
    }

    const parsedClienteId = Number(clienteId);
    const parsedPasseioId = Number(passeioId);

    if (isNaN(parsedClienteId) || isNaN(parsedPasseioId)) {
      res.status(400).json({ message: 'IDs inválidos' });
      return;
    }

    // Verificar se cliente existe
    const cliente = await prisma.clientes.findUnique({ where: { id: parsedClienteId } });
    if (!cliente) {
      res.status(404).json({ message: 'Cliente não encontrado' });
      return;
    }

    // Verificar se passeio existe
    const passeio = await prisma.passeio.findUnique({
      where: { id: parsedPasseioId },
    });
    if (!passeio) {
      res.status(404).json({ message: 'Passeio não encontrado' });
      return;
    }

    // Validar que o passeio não é no passado
    const agora = new Date();
    const dataPasseio = new Date(passeio.data);
    const fimDoDia = new Date(dataPasseio);
    fimDoDia.setHours(23, 59, 59, 999);
    if (fimDoDia < agora) {
      res.status(400).json({ message: 'Não é possível agendar para uma data passada' });
      return;
    }

    // Verificar capacidade
    const { disponiveis } = await calcularVagasDisponiveis(parsedPasseioId);
    const vagasSolicitadas = 1 + (acompanhantes ? Number(acompanhantes) : 0);
    if (vagasSolicitadas > disponiveis) {
      res.status(400).json({ message: 'Passeio lotado. Vagas insuficientes' });
      return;
    }

    // Verificar se cliente já tem agendamento neste passeio
    const jaAgendado = await prisma.agendamento.findFirst({
      where: { clienteId: parsedClienteId, passeioId: parsedPasseioId, status: { not: 'CANCELADO' } },
    });
    if (jaAgendado) {
      res.status(400).json({ message: 'Cliente já possui agendamento neste passeio' });
      return;
    }

    const numAcompanhantes = acompanhantes ? Number(acompanhantes) : 0;

    const wantsNotification = notificacao === true || notificacao === 'true';
    const cleanedToken = typeof fcmToken === 'string' ? fcmToken.trim() : '';
    let pushSubscription = null;

    if (wantsNotification && cleanedToken) {
      try {
        pushSubscription = await upsertPushSubscription(
          parsedClienteId,
          cleanedToken,
          req.get('user-agent') || undefined,
        );
      } catch (upsertErr) {
        console.error('Erro ao upsert PushSubscription:', upsertErr);
        res.status(500).json({ message: 'Erro ao salvar token de notificação' });
        return;
      }
    }

    const reminderCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const notificationSchedules = wantsNotification && pushSubscription
      ? calculateNotificationTimes(passeio.data, passeio.horario).filter((item) => item.enviarEm >= reminderCutoff)
      : [];

    const agendamento = await prisma.agendamento.create({
      data: {
        clienteId: parsedClienteId,
        passeioId: parsedPasseioId,
        acompanhantes: numAcompanhantes,
        notificacao: wantsNotification,
        notificacoes: pushSubscription && notificationSchedules.length > 0 ? {
          create: notificationSchedules.map((schedule) => ({
            tipo: schedule.tipo,
            enviarEm: schedule.enviarEm,
            pushSubscription: { connect: { id: pushSubscription.id } },
          })),
        } : undefined,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true, preco: true } },
      },
    });

    res.status(201).json(agendamento);
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
}

// Endpoint público para agendamento — busca ou cria cliente automaticamente
export async function consultaPorDocumento(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const documento = String(req.params.documento ?? '').replace(/\D/g, '');

    if (isNaN(id) || !documento || documento.length < 11) {
      res.status(400).json({ message: 'ID e CPF válidos são obrigatórios' });
      return;
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id,
        cliente: {
          cpf: { contains: documento },
        },
      },
      include: {
        cliente: { select: { id: true, nome: true, cpf: true } },
        passeio: {
          select: {
            id: true, data: true, horario: true, preco: true,
            usuario: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!agendamento) {
      res.status(404).json({ message: 'Nenhum agendamento encontrado para o ID e CPF informados.' });
      return;
    }

    const passageiros = 1 + agendamento.acompanhantes;

    res.json({
      id: agendamento.id,
      situacao: agendamento.status,
      data: agendamento.passeio.data.toISOString().split('T')[0],
      horario: agendamento.passeio.horario,
      vagas: passageiros,
      total: Number(agendamento.passeio.preco) * passageiros,
      cliente: agendamento.cliente.nome,
      cpf: agendamento.cliente.cpf,
    });
  } catch (error) {
    console.error('Erro ao consultar agendamento:', error);
    res.status(500).json({ message: 'Erro ao consultar agendamento' });
  }
}

async function obterOuCriarPasseioParaInstancia(instanciaId: number) {
  const instancia = await prisma.slotInstancia.findUnique({
    where: { id: instanciaId },
    include: {
      slotPasseio: {
        include: {
          usuario: { select: { id: true, name: true, perfil: true } },
        },
      },
      atribuicoes: {
        where: { status: 'ATRIBUIDO' },
        include: { vagoneteiro: { select: { id: true, name: true } } },
      },
    },
  });

  if (!instancia) {
    return null;
  }

  const slot = instancia.slotPasseio;
  if (!slot || slot.status !== 'DISPONIVEL') {
    throw new Error('Instância de slot indisponível para agendamento');
  }
  const vagoneteiroResponsavelId = instancia.atribuicoes[0]?.vagoneteiroId || slot.usuarioId;
  
  if (!vagoneteiroResponsavelId) {
    throw new Error('Slot sem vagoneteiro vinculado (nem lote fechado nem atribuído)');
  }

  let passeio = await prisma.passeio.findFirst({
    where: { slotInstanciaId: instancia.id },
  });

  if (!passeio) {
    passeio = await prisma.passeio.create({
      data: {
        usuarioId: vagoneteiroResponsavelId,
        preco: slot.valor,
        capacidade: slot.capacidade,
        data: instancia.data,
        horario: instancia.horaInicio,
        status: 'CONFIRMADO',
        ativo: true,
        slotInstanciaId: instancia.id,
      },
    });
  } else if (passeio.status === 'CANCELADO' || !passeio.ativo) {
    // Passeio foi cancelado (todos agendamentos anteriores cancelados).
    // Reativa para que o novo agendamento seja contabilizado corretamente.
    passeio = await prisma.passeio.update({
      where: { id: passeio.id },
      data: { status: 'CONFIRMADO', ativo: true },
    });
  }

  return passeio;
}

export async function agendarPublico(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { nome, telefone, email, documento, passeioId, instanciaId, promocao, notificacao, ciente, acompanhantes } = req.body;

    if (!nome || !telefone || (!passeioId && !instanciaId)) {
      res.status(400).json({ message: 'nome, telefone e instanciaId ou passeioId são obrigatórios' });
      return;
    }

    const parsedInstanciaId = instanciaId ? Number(instanciaId) : undefined;
    const parsedPasseioId = passeioId ? Number(passeioId) : undefined;

    if (parsedInstanciaId !== undefined && isNaN(parsedInstanciaId)) {
      res.status(400).json({ message: 'instanciaId inválido' });
      return;
    }
    if (parsedPasseioId !== undefined && isNaN(parsedPasseioId)) {
      res.status(400).json({ message: 'passeioId inválido' });
      return;
    }

    let passeio: any = null;
    if (parsedInstanciaId !== undefined) {
      try {
        passeio = await obterOuCriarPasseioParaInstancia(parsedInstanciaId);
      } catch (err) {
        res.status(400).json({ message: err instanceof Error ? err.message : 'Instância de slot inválida' });
        return;
      }
      if (!passeio) {
        res.status(404).json({ message: 'Instância de slot não encontrada' });
        return;
      }
    } else if (parsedPasseioId !== undefined) {
      passeio = await prisma.passeio.findUnique({
        where: { id: parsedPasseioId, ativo: true },
      });
      if (!passeio) {
        res.status(404).json({ message: 'Passeio não encontrado ou inativo' });
        return;
      }
    }

    if (!passeio) {
      res.status(400).json({ message: 'Passeio inválido' });
      return;
    }

    // Validar que o passeio não é no passado
    const agora = new Date();
    const dataPasseio = new Date(passeio.data);
    const fimDoDia = new Date(dataPasseio);
    fimDoDia.setHours(23, 59, 59, 999);
    if (fimDoDia < agora) {
      res.status(400).json({ message: 'Não é possível agendar para uma data passada' });
      return;
    }

    // Verificar capacidade
    const { disponiveis } = await calcularVagasDisponiveis(passeio.id);
    const vagasSolicitadas = 1 + (acompanhantes ? Number(acompanhantes) : 0);
    if (vagasSolicitadas > disponiveis) {
      res.status(400).json({ message: 'Passeio lotado. Vagas insuficientes' });
      return;
    }

    // Buscar cliente existente por documento, telefone ou email
    const cleanedTel = telefone.replace(/\D/g, '');
    const cleanedEmail = email ? email.trim().toLowerCase() : '';
    const cleanedDoc = documento ? documento.replace(/\D/g, '') : '';

    const whereOR: any[] = [
      { telefone: cleanedTel },
      ...(cleanedEmail ? [{ email: cleanedEmail }] : []),
    ];
    if (cleanedDoc && (cleanedDoc.length === 11 || cleanedDoc.length === 14)) {
      whereOR.push({ cpf: cleanedDoc });
    }

    let cliente = await prisma.clientes.findFirst({
      where: { OR: whereOR },
    });

    // Se não encontrou, cria novo cliente
    if (!cliente) {
      const cpDoc = cleanedDoc && (cleanedDoc.length === 11 || cleanedDoc.length === 14)
        ? cleanedDoc
        : `T${Date.now()}`;
      cliente = await prisma.clientes.create({
        data: {
          nome: nome.trim(),
          cpf: cpDoc,
          telefone: cleanedTel,
          email: cleanedEmail || null,
        },
      });
    } else {
      // Atualizar nome se o cliente existente não tiver nome ou se foi fornecido
      if (nome && nome.trim() !== cliente.nome) {
        cliente = await prisma.clientes.update({
          where: { id: cliente.id },
          data: { nome: nome.trim() },
        });
      }
    }

    // Verificar se já tem agendamento neste passeio
    const jaAgendado = await prisma.agendamento.findFirst({
      where: {
        clienteId: cliente.id,
        passeioId: passeio.id,
        status: { not: 'CANCELADO' },
      },
    });
    if (jaAgendado) {
      res.status(400).json({ message: 'Cliente já possui agendamento neste passeio' });
      return;
    }

    const wantsNotification = notificacao === true || notificacao === 'true';
    const rawToken = req.body?.fcmToken;
    const cleanedToken = typeof rawToken === 'string' ? rawToken.trim() : '';
    let pushSubscription = null;

    if (wantsNotification && cleanedToken) {
      try {
        pushSubscription = await upsertPushSubscription(
          cliente.id,
          cleanedToken,
          req.get('user-agent') || undefined,
        );
      } catch (upsertErr) {
        console.error('Erro ao upsert PushSubscription:', upsertErr);
        res.status(500).json({ message: 'Erro ao salvar token de notificação, desabilite a função de envio de notificações para prosseguir' });
        return;
      }
    }

    const reminderCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const notificationSchedules = wantsNotification && pushSubscription
      ? calculateNotificationTimes(passeio.data, passeio.horario).filter((item) => item.enviarEm >= reminderCutoff)
      : [];

    const agendamento = await prisma.agendamento.create({
      data: {
        clienteId: cliente.id,
        passeioId: passeio.id,
        promocao: promocao === true,
        notificacao: wantsNotification,
        ciente: ciente === true,
        acompanhantes: acompanhantes ? Number(acompanhantes) : 0,
        notificacoes: pushSubscription && notificationSchedules.length > 0 ? {
          create: notificationSchedules.map((schedule) => ({
            tipo: schedule.tipo,
            enviarEm: schedule.enviarEm,
            pushSubscription: { connect: { id: pushSubscription.id } },
          })),
        } : undefined,
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true, horario: true, preco: true } },
      },
    });

    // Disparar email de confirmação se o cliente informou email
    if (cliente.email) {
      enviarEmailConfirmacaoAgendamento(
        cliente.email,
        cliente.nome,
        agendamento.id,
        agendamento.passeio.data.toISOString().slice(0, 10),
        agendamento.passeio.horario,
        `Passeio de Vagoneta #${agendamento.passeio.id} — R$ ${Number(agendamento.passeio.preco).toFixed(2).replace('.', ',')}`,
      );
    }

    res.status(201).json(agendamento);
  } catch (error) {
    console.error('Erro ao criar agendamento público:', error);
    res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
}

// Endpoint público — retorna passeios com vagas disponíveis (capacidade - ocupadas)
export async function vagasDisponiveis(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const instancias = await prisma.slotInstancia.findMany({
      where: {
        data: { gte: hoje },
        status: 'AGENDADO',
        slotPasseio: { status: 'DISPONIVEL' },
        OR: [
          { slotPasseio: { usuarioId: { not: null } } },
          { atribuicoes: { some: { status: 'ATRIBUIDO' } } }
        ]
      },
      include: {
        slotPasseio: {
          include: {
            usuario: { select: { id: true, name: true } },
          },
        },
        atribuicoes: {
          where: { status: 'ATRIBUIDO' },
          include: { vagoneteiro: { select: { id: true, name: true } } },
        }
      },
      orderBy: [{ data: 'asc' }, { horaInicio: 'asc' }],
    });

    if (instancias.length === 0) {
      res.json({ data: [] });
      return;
    }

    const instanciaIds = instancias.map((inst) => inst.id);

    const passeiosExistentes = await prisma.passeio.findMany({
      where: {
        slotInstanciaId: { in: instanciaIds },
        status: { not: 'CANCELADO' },
      },
      select: { id: true, slotInstanciaId: true },
    });

    const passeioIds = passeiosExistentes.map((p) => p.id);
    const agendamentosPorPasseio = passeioIds.length > 0
      ? await prisma.agendamento.groupBy({
          by: ['passeioId'],
          where: {
            passeioId: { in: passeioIds },
            status: { not: 'CANCELADO' },
          },
          _count: { _all: true },
          _sum: { acompanhantes: true },
        })
      : [];

    const ocupacaoMap = new Map<number, number>();
    agendamentosPorPasseio.forEach((group) => {
      const ocupadas = (group._count._all || 0) + (group._sum.acompanhantes || 0);
      ocupacaoMap.set(group.passeioId, ocupadas);
    });

    const passeioPorInstancia = new Map<number, number>();
    passeiosExistentes.forEach((p) => {
      if (p.slotInstanciaId !== null) {
        passeioPorInstancia.set(p.slotInstanciaId, p.id);
      }
    });

    const resultado = instancias.map((inst) => {
      const slot = inst.slotPasseio;
      const passeioId = passeioPorInstancia.get(inst.id);
      const vagasOcupadas = passeioId ? ocupacaoMap.get(passeioId) ?? 0 : 0;
      const vagasDisponiveis = slot.capacidade - vagasOcupadas;

      return {
        id: inst.id,
        instanciaId: inst.id,
        slotPasseioId: inst.slotPasseioId,
        titulo: slot.titulo,
        descricao: slot.descricao,
        data: inst.data,
        horario: inst.horaInicio,
        horaFim: inst.horaFim,
        capacidade: slot.capacidade,
        valor: slot.valor,
        preco: slot.valor,
        vagasOcupadas,
        vagasDisponiveis,
        usuario: inst.atribuicoes[0]?.vagoneteiro || slot.usuario,
      };
    });

    res.json({ data: resultado });
  } catch (error) {
    console.error('Erro ao buscar vagas disponíveis:', error);
    res.status(500).json({ message: 'Erro ao buscar vagas disponíveis' });
  }
}

export async function atualizarStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const { status } = req.body;
    const statusValidos = ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'REMARCADO', 'REALIZADO'];

    if (!status || !statusValidos.includes(status)) {
      res.status(400).json({
        message: `Status inválido. Valores permitidos: ${statusValidos.join(', ')}`,
      });
      return;
    }

    const agendamentoExistente = await prisma.agendamento.findUnique({ where: { id } });
    if (!agendamentoExistente) {
      res.status(404).json({ message: 'Agendamento não encontrado' });
      return;
    }

    const agendamento = await prisma.agendamento.update({
      where: { id },
      data: { status },
      include: {
        cliente: { select: { id: true, nome: true } },
        passeio: { select: { id: true, data: true, preco: true } },
      },
    });

    res.json(agendamento);
  } catch (error) {
    console.error('Erro ao atualizar status do agendamento:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do agendamento' });
  }
}

export async function deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const agendamentoExistente = await prisma.agendamento.findUnique({ where: { id } });
    if (!agendamentoExistente) {
      res.status(404).json({ message: 'Agendamento não encontrado' });
      return;
    }

    await prisma.agendamento.delete({ where: { id } });
    res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ message: 'Erro ao deletar agendamento' });
  }
}
