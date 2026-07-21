import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { generateToken } from '../utils/jwt';

// Helper para limpar formatação de CPF (remover pontos e traço)
function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

// Helper para validar e-mail simples
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function cadastro(req: Request, res: Response): Promise<void> {
  try {
    const { name, cpf, senha, email, telefone, historico, experiencia, data_associacao, foto, perfil } = req.body;

    // Validar campos obrigatórios
    if (!name || !cpf || !senha || !telefone) {
      res.status(400).json({ message: 'Nome, CPF, Senha e Telefone são obrigatórios' });
      return;
    }

    const cleanedCpf = cleanCPF(cpf);
    if (cleanedCpf.length !== 11) {
      res.status(400).json({ message: 'CPF inválido. Deve conter 11 dígitos' });
      return;
    }

    if (senha.length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    if (email && !isValidEmail(email)) {
      res.status(400).json({ message: 'Formato de e-mail inválido' });
      return;
    }

    // Verificar se CPF já está cadastrado
    const existingUserCpf = await prisma.usuario.findUnique({
      where: { cpf: cleanedCpf },
    });

    if (existingUserCpf) {
      res.status(400).json({ message: 'Este CPF já está cadastrado' });
      return;
    }

    // Verificar se E-mail já está cadastrado (se fornecido)
    if (email) {
      const existingUserEmail = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUserEmail) {
        res.status(400).json({ message: 'Este E-mail já está cadastrado' });
        return;
      }
    }

    // Hash da senha
    const saltRounds = 10;
    const hashedSenha = await bcrypt.hash(senha, saltRounds);

    // Validar data_associacao se fornecida
    let parsedDataAssociacao = undefined;
    if (data_associacao) {
      parsedDataAssociacao = new Date(data_associacao);
      if (isNaN(parsedDataAssociacao.getTime())) {
        res.status(400).json({ message: 'Data de associação inválida' });
        return;
      }
    }

    // Processar foto (base64 → Buffer)
    let fotoBuffer: Buffer | undefined = undefined;
    if (foto) {
      // Aceita formato "data:image/...;base64,..." ou base64 puro
      const base64Data = foto.includes('base64,') ? foto.split('base64,')[1] : foto;
      fotoBuffer = Buffer.from(base64Data, 'base64');
      if (fotoBuffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ message: 'A foto deve ter no máximo 5MB' });
        return;
      }
    }

    // Criar o usuário
    const novoUsuario = await prisma.usuario.create({
      data: {
        name,
        cpf: cleanedCpf,
        senha: hashedSenha,
        email: email || null,
        telefone,
        historico: historico || null,
        experiencia: experiencia || null,
        data_associacao: parsedDataAssociacao,
        foto: fotoBuffer,
        perfil: perfil || 'VAGONETEIRO',
      },
    });

    // Gerar token
    const token = generateToken({
      id: novoUsuario.id,
      cpf: novoUsuario.cpf,
      email: novoUsuario.email,
      perfil: novoUsuario.perfil,
    });

    // Retornar usuário sem a senha
    const { senha: _, ...usuarioSemSenha } = novoUsuario;

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      token,
      user: usuarioSemSenha,
    });
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).json({ message: 'Erro interno ao realizar o cadastro' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { identifier, senha } = req.body;

    // identifier pode ser CPF ou E-mail
    if (!identifier || !senha) {
      res.status(400).json({ message: 'CPF/E-mail e senha são obrigatórios' });
      return;
    }

    const cleanedIdentifier = cleanCPF(identifier);
    let usuario = null;

    // Tenta buscar por CPF se tiver 11 dígitos, caso contrário tenta por e-mail
    if (cleanedIdentifier.length === 11) {
      usuario = await prisma.usuario.findUnique({
        where: { cpf: cleanedIdentifier },
      });
    }

    if (!usuario) {
      usuario = await prisma.usuario.findUnique({
        where: { email: identifier },
      });
    }

    if (!usuario) {
      res.status(401).json({ message: 'CPF/E-mail ou senha incorretos' });
      return;
    }

    // Comparar senhas
    const matches = await bcrypt.compare(senha, usuario.senha);
    if (!matches) {
      res.status(401).json({ message: 'CPF/E-mail ou senha incorretos' });
      return;
    }

    // Gerar token
    const token = generateToken({
      id: usuario.id,
      cpf: usuario.cpf,
      email: usuario.email,
      perfil: usuario.perfil,
    });

    // Retornar usuário sem a senha
    const { senha: _, ...usuarioSemSenha } = usuario;

    res.status(200).json({
      message: 'Login realizado com sucesso',
      token,
      user: usuarioSemSenha,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno ao realizar o login' });
  }
}

export async function cadastroAdmin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, cpf, senha, email, telefone } = req.body;

    if (!name || !cpf || !senha || !email || !telefone) {
      res.status(400).json({ message: 'Nome, CPF, Senha, E-mail e Telefone são obrigatórios' });
      return;
    }

    const cleanedCpf = cleanCPF(cpf);
    if (cleanedCpf.length !== 11) {
      res.status(400).json({ message: 'CPF inválido. Deve conter 11 dígitos' });
      return;
    }

    if (senha.length < 6) {
      res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'Formato de e-mail inválido' });
      return;
    }

    const existingCpf = await prisma.usuario.findUnique({ where: { cpf: cleanedCpf } });
    if (existingCpf) {
      res.status(400).json({ message: 'Este CPF já está cadastrado' });
      return;
    }

    const existingEmail = await prisma.usuario.findUnique({ where: { email } });
    if (existingEmail) {
      res.status(400).json({ message: 'Este E-mail já está cadastrado' });
      return;
    }

    const hashedSenha = await bcrypt.hash(senha, 10);

    const admin = await prisma.usuario.create({
      data: {
        name,
        cpf: cleanedCpf,
        senha: hashedSenha,
        email,
        telefone,
        perfil: 'ADMIN',
      },
    });

    const { senha: _, ...adminSemSenha } = admin;

    res.status(201).json({
      message: 'Administrador cadastrado com sucesso',
      user: adminSemSenha,
    });
  } catch (error) {
    console.error('Erro ao cadastrar admin:', error);
    res.status(500).json({ message: 'Erro interno ao cadastrar administrador' });
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // req.user já vem injetado pelo authMiddleware
    if (!req.user) {
      res.status(401).json({ message: 'Não autenticado' });
      return;
    }

    res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error('Erro na rota /me:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
