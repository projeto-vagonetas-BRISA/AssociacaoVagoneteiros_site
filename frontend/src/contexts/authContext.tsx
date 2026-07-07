import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string;
  perfil: 'USUARIO' | 'ADMIN' | 'REDATOR';
  data_associacao: string;
  historico: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = 'http://localhost:3000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Carregar sessão salva no mount
  useEffect(() => {
    async function loadStoredSession() {
      const storedToken = localStorage.getItem('@Vagoneteiros:token');
      const storedUser = localStorage.getItem('@Vagoneteiros:user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Validar o token com o backend para garantir que ainda é válido
          const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            localStorage.setItem('@Vagoneteiros:user', JSON.stringify(data.user));
          } else {
            // Se falhar (token expirado), deslogar
            localStorage.removeItem('@Vagoneteiros:token');
            localStorage.removeItem('@Vagoneteiros:user');
            setToken(null);
            setUser(null);
          }
        } catch (error) {
          console.error('Erro ao verificar sessão:', error);
        }
      }
      setLoading(false);
    }

    loadStoredSession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('@Vagoneteiros:token', newToken);
    localStorage.setItem('@Vagoneteiros:user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('@Vagoneteiros:token');
    localStorage.removeItem('@Vagoneteiros:user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('@Vagoneteiros:user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
