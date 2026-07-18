import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../lib/prisma';
import { calculateNotificationTimes } from '../utils/notificationUtils';

export async function listar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const agendamentos = await prisma.agendamento.findMany({
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

    // 🛑 Validar que o passeio não é no passado
    const agora = new Date();
    const dataPasseio = new Date(passeio.data);
    const fimDoDia = new Date(dataPasseio);
    fimDoDia.setHours(23, 59, 59, 999);
    if (fimDoDia < agora) {
      res.status(400).json({ message: 'Não é possível agendar para uma data passada' });
      return;
    }

    // Calcular vagas já ocupadas (1 por agendamento + acompanhantes)
    const agendamentosAtivos = await prisma.agendamento.findMany({
      where: { passeioId: parsedPasseioId, status: { not: 'CANCELADO' } },
      select: { acompanhantes: true },
    });
    const vagasOcupadas = agendamentosAtivos.reduce((sum, a) => sum + 1 + a.acompanhantes, 0);

    // Verificar capacidade
    const vagasSolicitadas = 1 + (acompanhantes ? Number(acompanhantes) : 0);
    if (vagasOcupadas + vagasSolicitadas > passeio.capacidade) {
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
        pushSubscription = await prisma.pushSubscription.upsert({
          where: { token: cleanedToken },
          create: {
            token: cleanedToken,
            clienteId: parsedClienteId,
            userAgent: req.get('user-agent') || undefined,
          },
          update: {
            clienteId: parsedClienteId,
            userAgent: req.get('user-agent') || undefined,
          },
        });
      } catch (upsertErr) {
        console.error('Erro ao upsert PushSubscription:', upsertErr);
        res.status(500).json({ message: 'Erro ao salvar token de notificação' });
        return;
      }
    }

    const notificationSchedules = wantsNotification && pushSubscription
      ? calculateNotificationTimes(passeio.data, passeio.horario).filter((item) => item.enviarEm > new Date())
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
export async function agendarPublico(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { nome, telefone, email, documento, passeioId, promocao, notificacao, ciente, acompanhantes } = req.body;

    if (!nome || !telefone || !passeioId) {
      res.status(400).json({ message: 'nome, telefone e passeioId são obrigatórios' });
      return;
    }

    const parsedPasseioId = Number(passeioId);
    if (isNaN(parsedPasseioId)) {
      res.status(400).json({ message: 'passeioId inválido' });
      return;
    }

    // Verificar se passeio existe
    const passeio = await prisma.passeio.findUnique({
      where: { id: parsedPasseioId, ativo: true },
    });
    if (!passeio) {
      res.status(404).json({ message: 'Passeio não encontrado ou inativo' });
      return;
    }

    // 🛑 Validar que o passeio não é no passado
    const agora = new Date();
    const dataPasseio = new Date(passeio.data);
    const fimDoDia = new Date(dataPasseio);
    fimDoDia.setHours(23, 59, 59, 999);
    if (fimDoDia < agora) {
      res.status(400).json({ message: 'Não é possível agendar para uma data passada' });
      return;
    }

    // Calcular vagas já ocupadas (1 por agendamento + acompanhantes)
    const agendamentosAtivos = await prisma.agendamento.findMany({
      where: { passeioId: parsedPasseioId, status: { not: 'CANCELADO' } },
      select: { acompanhantes: true },
    });
    const vagasOcupadas = agendamentosAtivos.reduce((sum, a) => sum + 1 + a.acompanhantes, 0);
    const vagasSolicitadas = 1 + (acompanhantes ? Number(acompanhantes) : 0);
    if (vagasOcupadas + vagasSolicitadas > passeio.capacidade) {
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
        passeioId: parsedPasseioId,
        status: { not: 'CANCELADO' },
      },
    });
    if (jaAgendado) {
      res.status(400).json({ message: 'Cliente já possui agendamento neste passeio' });
      return;
    }

    const wantsNotification = notificacao === true || notificacao === 'true';
    const cleanedToken = typeof (req.body as any).fcmToken === 'string' ? (req.body as any).fcmToken.trim() : '';
    let pushSubscription = null;

    if (wantsNotification && cleanedToken) {
      try {
        pushSubscription = await prisma.pushSubscription.upsert({
          where: { token: cleanedToken },
          create: {
            token: cleanedToken,
            clienteId: cliente.id,
            userAgent: req.get('user-agent') || undefined,
          },
          update: {
            clienteId: cliente.id,
            userAgent: req.get('user-agent') || undefined,
          },
        });
      } catch (upsertErr) {
        console.error('Erro ao upsert PushSubscription:', upsertErr);
        res.status(500).json({ message: 'Erro ao salvar token de notificação' });
        return;
      }
    }

    const notificationSchedules = wantsNotification && pushSubscription
      ? calculateNotificationTimes(passeio.data, passeio.horario).filter((item) => item.enviarEm > new Date())
      : [];

    const agendamento = await prisma.agendamento.create({
      data: {
        clienteId: cliente.id,
        passeioId: parsedPasseioId,
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

    const passeios = await prisma.passeio.findMany({
      where: {
        ativo: true,
        data: { gte: hoje },
      },
      include: {
        usuario: { select: { id: true, name: true } },
        agendamentos: {
          where: { status: { not: 'CANCELADO' } },
          select: { acompanhantes: true },
        },
      },
      orderBy: { data: 'asc' },
    });

    const resultado = passeios.map(p => {
      const vagasOcupadas = p.agendamentos.reduce((sum, a) => sum + 1 + a.acompanhantes, 0);
      return {
        id: p.id,
        preco: p.preco,
        capacidade: p.capacidade,
        data: p.data,
        horario: p.horario,
        vagasOcupadas,
        vagasDisponiveis: p.capacidade - vagasOcupadas,
        usuario: p.usuario,
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
    const statusValidos = ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'REMARCADO'];

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
        passeio: { select: { id: true, data: true, valor: true } },
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
