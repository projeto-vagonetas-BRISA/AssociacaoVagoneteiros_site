import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService, type User } from '../services/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (identifier: string, senha: string) => Promise<User>;
  register: (data: {
    name: string;
    cpf: string;
    senha: string;
    email?: string;
    telefone: string;
    historico?: string;
  }) => Promise<User>;
  logout: () => void;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.recuperarUser());
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback(async (identifier: string, senha: string) => {
    const data = await authService.login(identifier, senha);
    authService.salvarSessao(data.token, data.user);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (data: {
    name: string;
    cpf: string;
    senha: string;
    email?: string;
    telefone: string;
    historico?: string;
  }) => {
    const result = await authService.register(data);
    authService.salvarSessao(result.token, result.user);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    authService.destruirSessao();
    setUser(null);
  }, []);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    const userData = await authService.verificarSessao();
    setUser(userData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const isAuthenticated = user !== null;
  const isAdmin = user?.perfil === 'ADMIN' || user?.perfil === 'REDATOR';

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isLoading, login, register, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}