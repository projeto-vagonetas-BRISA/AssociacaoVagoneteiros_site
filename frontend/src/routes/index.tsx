import { createBrowserRouter } from "react-router-dom";
import { Home } from "../pages/Home";
import { Layout } from "../components/Layout";
import { Galeria } from "../pages/Galeria";
import { Cadastro } from "../pages/Cadastro";
import { Entrar } from "../pages/Entrar";
import { Agendamento } from "../pages/Agendamento";
import { PainelAdm } from "../pages/PainelAdm";
import { Historia } from "../pages/Historia";
import { AdminLayout } from "../components/AdminLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminPasseios } from "../pages/admin/Passeios";
import { AdminClientes } from "../pages/admin/Clientes";
import { AdminAgendamentos } from "../pages/admin/Agendamentos";
import { AdminAvaliacoes } from "../pages/admin/Avaliacoes";
import { AdminUsuarios } from "../pages/admin/Usuarios";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/galeria", element: <Galeria /> },
      { path: "/cadastro", element: <Cadastro /> },
      { path: "/entrar", element: <Entrar /> },
      { path: "/agendamento", element: <Agendamento /> },
      { path: "/historia", element: <Historia /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedPerfis={['ADMIN', 'REDATOR']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "", element: <PainelAdm /> },
      { path: "passeios", element: <AdminPasseios /> },
      { path: "clientes", element: <AdminClientes /> },
      { path: "agendamentos", element: <AdminAgendamentos /> },
      { path: "avaliacoes", element: <AdminAvaliacoes /> },
      { path: "usuarios", element: <AdminUsuarios /> },
    ],
  },
]);
