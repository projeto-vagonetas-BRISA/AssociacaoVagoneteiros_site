import { createBrowserRouter } from "react-router-dom";
import { Home } from "../pages/Home";
import { Layout } from "../components/Layout";
import { Galeria } from "../pages/Galeria";
import { Cadastro } from "../pages/Cadastro";
import { Agendamento } from "../pages/Agendamento";
import { PainelAdm } from "../pages/PainelAdm";
import { Historia } from "../pages/Historia";

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
        path: "/admin",
        element: <PainelAdm />
      },      
      {
        path: "/historia",
        element: <Historia />
      }
    ]
  }
]);