import { api } from './api';

export interface User {
  id: number;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string;
  perfil: 'USUARIO' | 'VAGONETEIRO' | 'ADMIN' | 'REDATOR';
  historico: string | null;
  data_associacao: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface CreateOnlyResponse {
  message: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export const authService = {
  async login(identifier: string, senha: string): Promise<AuthResponse> {
    const data = await api.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, senha }),
    });
    return data;
  },

  async register(data: {
    name: string;
    cpf: string;
    senha: string;
    email?: string;
    telefone: string;
    historico?: string;
    experiencia?: string;
    data_associacao?: string;
  }): Promise<AuthResponse> {
    const result = await api.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result;
  },

  /**
   * Cadastra um usuário SEM alterar a sessão atual.
   * Útil para admin cadastrar vagoneteiros sem perder o próprio login.
   */
  async createOnly(data: {
    name: string;
    cpf: string;
    senha: string;
    email?: string;
    telefone: string;
    historico?: string;
    experiencia?: string;
    data_associacao?: string;
    foto?: string;
  }): Promise<User> {
    const result = await api.request<CreateOnlyResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.user;
  },

  async createAdmin(data: {
    name: string;
    cpf: string;
    senha: string;
    email: string;
    telefone: string;
  }): Promise<User> {
    const result = await api.request<CreateOnlyResponse>('/auth/register/admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.user;
  },

  async me(): Promise<User> {
    const data = await api.request<MeResponse>('/auth/me');
    return data.user;
  },

  salvarSessao(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  recuperarToken(): string | null {
    return localStorage.getItem('token');
  },

  recuperarUser(): User | null {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  destruirSessao(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async verificarSessao(): Promise<User | null> {
    const token = this.recuperarToken();
    if (!token) return null;

    try {
      const user = await this.me();
      // Atualiza dados do usuário no storage
      this.salvarSessao(token, user);
      return user;
    } catch {
      this.destruirSessao();
      return null;
    }
  },
};