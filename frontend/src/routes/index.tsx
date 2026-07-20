import { createBrowserRouter } from "react-router-dom";
import { Home } from "../pages/Home";
import { Layout } from "../components/Layout";
import { Galeria } from "../pages/Galeria";
import { Cadastro } from "../pages/Cadastro";
import { Agendamento } from "../pages/Agendamento";
import { Historia } from "../pages/Historia";
import { PainelAdmin } from "../pages/PainelAdm";
import { CadastroPasseio } from "../pages/CadastroPasseio";
import { EditarPasseio } from "../pages/EditarPasseio";
import { Investimento } from "../pages/Investimento";
import { VagoneteiroPerfil } from "../pages/admin/VagoneteiroPerfil";
import { ConsultaAgendamento } from "../pages/ConsultaAgendamento";
import { FeedVagoneteiro } from "../pages/FeedVagoneteiro";
import { MinhasAtribuicoes } from "../pages/MinhasAtribuicoes";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/galeria",
        element: <Galeria />
      },
      {
        path: "/cadastro",
        element: <Cadastro />
      },
      {
        path: "/agendamento",
        element: <Agendamento />
      },      
      {
        path: "/consulta-agendamento",
        element: <ConsultaAgendamento />
      },
      {
        path: "/historia",
        element: <Historia />
      },
      {
        path: "/investimento",
        element: <Investimento />
      },
      {
        path: "/painel-admin",
        element: <PainelAdmin />
      },
      {
        path: "/cadastro-passeio",
        element: <CadastroPasseio />
      },
      {
        path: "/editar-passeio/:id",
        element: <EditarPasseio />
      },
      {
        path: "/consulta-agendamento",
        element: <ConsultaAgendamento />
      },
      {
        path: "/admin/vagoneteiros/:id",
        element: <VagoneteiroPerfil />
      },
      {
        path: "/feed-vagoneteiro",
        element: <FeedVagoneteiro />
      },
      {
        path: "/minhas-atribuicoes",
        element: <MinhasAtribuicoes />
      }
    ]
  }
]);
