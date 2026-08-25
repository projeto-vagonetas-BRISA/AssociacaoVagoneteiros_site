import { useEffect } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { HeaderAdm } from "../components/HeaderAdm";
import { useAuth } from "../contexts/AuthContext";

export function Layout() {
const location = useLocation();
const { isAuthenticated, isAdmin, isLoading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const cadastroTipo = new URLSearchParams(location.search).get("tipo");
  const isPublicCadastro = location.pathname === "/cadastro" && (cadastroTipo === "usuario" || cadastroTipo === "empresa");
  const isAdminCadastro = location.pathname === "/cadastro" && (cadastroTipo === "vagoneteiro" || cadastroTipo === "administrador");

  if (isPublicCadastro) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-bg-light-1 flex items-center justify-center">
          <div className="text-text-dark text-lg">Carregando...</div>
        </div>
      );
    }

    if (isAuthenticated) {
      return <Navigate to={isAdmin ? "/painel-admin" : "/"} replace />;
    }

    return (
      <>
        <Header />
        <Outlet />
        <Footer />
      </>
    );
  }

  if (isAdminCadastro) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-bg-light-1 flex items-center justify-center">
          <div className="text-text-dark text-lg">Carregando...</div>
        </div>
      );
    }

    if (!isAuthenticated || !isAdmin) {
      return <Navigate to="/" replace />;
    }

    return (
      <>
        <HeaderAdm />
        <Outlet />
        <Footer />
      </>
    );
  }

  // rotas administrativas protegem o acesso
  if (location.pathname.startsWith("/admin/") || location.pathname === "/painel-admin" || location.pathname === "/cadastro-passeio") {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-bg-light-1 flex items-center justify-center">
          <div className="text-text-dark text-lg">Carregando...</div>
        </div>
      );
    }

    if (!isAuthenticated || !isAdmin) {
      return <Navigate to="/" replace />;
    }

    return (
      <>
        <HeaderAdm />
        <Outlet />
        <Footer />
      </>
    );
  }
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}
