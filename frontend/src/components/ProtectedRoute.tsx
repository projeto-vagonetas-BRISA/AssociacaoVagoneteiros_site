import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'USUARIO' | 'ADMIN' | 'REDATOR';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061224] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-[#b61722] border-white/20 rounded-full animate-spin"></div>
          <p className="text-white/60 text-sm font-medium tracking-wide">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" replace />;
  }

  if (requiredRole && user.perfil !== requiredRole) {
    // Se for admin e o usuário for comum, redirecionar para home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
