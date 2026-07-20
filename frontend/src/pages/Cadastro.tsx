import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Registration_Usuario } from "../components/Registration_Usuario";
import { Registration_Vagoneteiro } from "../components/Registration_Vagoneteiro";
import { Registration_Administrador } from "../components/Registration_Administrador";
import { Registration_Empresa } from "../components/Registration_Empresa";

type CadastroTipo = "usuario" | "vagoneteiro" | "administrador" | "empresa";

const cadastroConfig: Record<CadastroTipo, { titulo: string; descricao: string; destaque: string; icone: string; formulario: React.ReactElement }> = {
    usuario: {
        titulo: "Cadastro de Usuário",
        descricao: "Use esse fluxo para criar a conta de acesso do passageiro.",
        destaque: "Acesso público",
        icone: "/src/assets/icons/user-24.png",
        formulario: <Registration_Usuario />,
    },
    empresa: {
        titulo: "Cadastro de Empresa",
        descricao: "Fluxo para cadastrar agências e empresas parceiras.",
        destaque: "Acesso público",
        icone: "/src/assets/icons/traveler-32.png",
        formulario: <Registration_Empresa />,
    },
    vagoneteiro: {
        titulo: "Cadastro de Vagoneteiro",
        descricao: "Fluxo administrativo para profissional responsável pelos passeios.",
        destaque: "Painel adm",
        icone: "/src/assets/icons/vagoneta-escuro-noBackground.png",
        formulario: <Registration_Vagoneteiro />,
    },
    administrador: {
        titulo: "Cadastro de Administrador",
        descricao: "Cadastro de equipe com acesso de gestão ao sistema.",
        destaque: "Painel adm",
        icone: "/src/assets/icons/userAdm-32.png",
        formulario: <Registration_Administrador />,
    },
};


export const Cadastro: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const tipo = useMemo<CadastroTipo>(() => {
        const valor = searchParams.get("tipo");
        if (valor === "usuario" || valor === "vagoneteiro" || valor === "administrador" || valor === "empresa") {
            return valor;
        }
        return "usuario";
    }, [searchParams]);

    const config = cadastroConfig[tipo];
    const isAdminCadastro = tipo === "vagoneteiro" || tipo === "administrador";

    return (
        <div className="min-h-screen bg-bg-light-1 flex flex-col">
            {isAdminCadastro ? (
                <>
                    <div className="max-w-5xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/painel-admin")}
                                className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                aria-label="Voltar"
                            >
                                <ArrowLeft size={20} className="text-text-dark" />
                            </button>
                            <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center shrink-0">
                                <img className="w-4 h-4" src={config.icone} alt="Ícone do cadastro" />
                            </div>
                            <div>
                                <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
                                    {config.titulo}
                                </h1>
                                <p className="text-sm text-text-secondary mt-1">
                                    {config.descricao}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 pb-10">
                        {config.formulario}
                    </div>
                </>
            ) : (
                <>
                    <div className="max-w-5xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center shrink-0">
                                <img className="w-4 h-4" src={config.icone} alt="Ícone do cadastro" />
                            </div>
                            <div>
                                <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
                                    {config.titulo}
                                </h1>
                                <p className="text-sm text-text-secondary mt-1">
                                    {config.descricao}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 pb-10">
                        {config.formulario}
                    </div>
                </>
            )}
        </div>
    );
};