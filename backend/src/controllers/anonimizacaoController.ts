import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import {
  anonimizarUsuario,
  anonimizarCliente,
  buscarUsuarioPorIdentificador,
  buscarClientePorIdentificador,
} from '../services/anonimizacao.service';

/**
 * POST /anonimizacao
 * Anonimiza um usuário ou cliente por CPF ou email (ADMIN).
 *
 * Body: { identificador: "<cpf ou email>" }
 * - identifica automaticamente se é USUARIO ou CLIENTE.
 */
export async function anonimizar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { identificador } = req.body || {};

    if (!identificador || typeof identificador !== 'string' || !identificador.trim()) {
      res.status(400).json({ message: 'Informe o CPF ou e-mail do titular.' });
      return;
    }
    const valor = identificador.trim();

    // 1) Procura como USUARIO (vagoneteiro/admin/etc)
    const usuario = await buscarUsuarioPorIdentificador(valor);
    if (usuario) {
      const resultado = await anonimizarUsuario(usuario.id);
      res.json({
        ...resultado,
        anonimizado: { id: usuario.id, name: resultado.tipo === 'USUARIO' ? 'Usuário anônimo' : undefined },
        message: `Usuário anonimizado (LGPD). Passeios desvinculados: ${resultado.afetados.passeios}.`,
      });
      return;
    }

    // 2) Procura como CLIENTE (turista)
    const cliente = await buscarClientePorIdentificador(valor);
    if (cliente) {
      const resultado = await anonimizarCliente(cliente.id);
      res.json({
        ...resultado,
        anonimizado: { id: cliente.id, nome: 'Cliente anônimo' },
        message: `Cliente anonimizado (LGPD). Avaliações anonimizadas: ${resultado.afetados.avaliacoes}.`,
      });
      return;
    }

    res.status(404).json({ message: 'Nenhum usuário ou cliente encontrado para esse CPF/e-mail.' });
  } catch (error: any) {
    console.error('Erro ao anonimizar:', error);
    res.status(500).json({ message: error?.message || 'Erro ao anonimizar' });
  }
}

/**
 * GET /anonimizacao/buscar?identificador=<cpf ou email>
 * Busca um usuário/cliente por CPF ou email (ADMIN) — para o audit antes de anonimizar.
 */
export async function buscar(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { identificador } = req.query;
    if (!identificador || typeof identificador !== 'string') {
      res.status(400).json({ message: 'Informe o CPF ou e-mail na query (identificador).' });
      return;
    }
    const valor = identificador.trim();

    const usuario = await buscarUsuarioPorIdentificador(valor);
    if (usuario) {
      res.json({ encontrado: true, tipo: 'USUARIO', registro: usuario });
      return;
    }
    const cliente = await buscarClientePorIdentificador(valor);
    if (cliente) {
      res.json({ encontrado: true, tipo: 'CLIENTE', registro: cliente });
      return;
    }
    res.json({ encontrado: false });
  } catch (error) {
    console.error('Erro ao buscar identificador:', error);
    res.status(500).json({ message: 'Erro ao buscar identificador' });
  }
}
