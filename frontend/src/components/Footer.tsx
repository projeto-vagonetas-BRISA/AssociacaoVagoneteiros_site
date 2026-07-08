import React from "react";
import conteudo from "../assets/conteudo.json";

export const Footer: React.FC = () => {
    return (
    <footer className="bg-blue-dark  py-12 w-full">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-white/10">

                <div className="flex flex-col gap-3">
                    <span className="font-bold text-xl text-white tracking-tight">Associação dos Vagoneteiros dos Molhes da Barra</span>
                    <p className="font-normal text-sm text-white/50 leading-relaxed text-justify md:text-left">
                        {conteudo.rodape_localizacao.descricao}
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <span className="font-bold text-xs text-white/40 tracking-widest uppercase">Links</span>
                    <ul className="flex flex-col gap-2">
                        {["Home", "História", "Galeria", "Agendamento"].map((link) => (
                            <li key={link}>
                                  <a  href={`/${link === "Home" ? "" : link.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()}`}className="text-sm text-white/55 hover:text-white/80 transition-colors">
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col gap-3">
                    <span className="font-bold text-xs text-white/40 tracking-widest uppercase">Legal</span>
                    <ul className="flex flex-col gap-2">
                        {["Nada", "Por enquanto", "Cookies"].map((link) => (
                            <li key={link}>
                                <a href="#" className="text-sm text-white/55 hover:text-white/80 transition-colors">
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-6">
                <p className="text-xs text-white/30">
                    © 2026 Vagoneteiros dos Molhes da Barra. Todos os direitos reservados.
                </p>

            </div>
        </div>
    </footer>
    )
}