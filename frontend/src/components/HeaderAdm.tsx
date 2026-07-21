import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileText, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export const HeaderAdm: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isAuthenticated = Boolean(user);

    const getIsActive = (path: string) => {
        const [pathname, search = ""] = path.split("?");
        const activeTipo = new URLSearchParams(location.search).get("tipo");
        const targetTipo = new URLSearchParams(search).get("tipo");

        if (pathname !== location.pathname) return false;
        if (!targetTipo) return true;
        return activeTipo === targetTipo;
    };

    const navLinks = [
        { label: "Cadastrar Vagoneteiro", path: "/cadastro?tipo=vagoneteiro" },
        { label: "Painel Adm", path: "/painel-admin" },
    ];

    return (
        <header className="w-full bg-blue-dark border-b border-white/10 sticky top-0 z-50">

            <nav className="relative max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 gap-8">
                <Link to="/" className="font-bold text-lg text-white tracking-tight shrink-0">
                    ADMIN
                </Link>

                <ul className="hidden md:flex items-center gap-8">
                    {navLinks.map(({ label, path }) => {
                        const active = getIsActive(path);
                        return (
                            <li key={label}>
                                <Link
                                    to={path}
                                    className={`relative text-sm font-medium tracking-wide transition-colors cursor-pointer ${
                                        active ? "text-white" : "text-white/60 hover:text-white"
                                    }`}>
                                    {label}
                                    {active && (
                                        <span className="absolute -bottom-5.5 left-0 right-0 h-0.75 bg-red-dark rounded-t-sm" />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex items-center gap-3 shrink-0">
                    <button className="hidden sm:inline-flex items-center gap-2 px-4 h-9 rounded bg-blue-accent text-white text-sm font-semibold transition-colors cursor-pointer">
                        <FileText size={15} /> Relatório Geral
                    </button>
                    {isAuthenticated && (
                        <button
                            onClick={() => { logout(); navigate("/"); }}
                            className="hidden sm:inline-flex items-center gap-2 px-4 h-9 rounded bg-red-dark hover:bg-red-hover text-white text-sm font-semibold transition-colors cursor-pointer">
                            <LogOut size={15} /> Sair
                        </button>
                    )}
                    {user && (
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-blue-accent flex items-center justify-center text-xs font-bold text-white">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                            <p className="text-sm text-white/80">{user.name}</p>
                        </div>
                    )}
                    

                    <button
                        className="md:hidden flex items-center justify-center w-9 h-9 text-white/60 hover:text-white transition-colors cursor-pointer"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Menu">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {menuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </nav>

            {menuOpen && (
                <div className="md:hidden bg-blue-dark border-t border-white/10 px-4 py-4 flex flex-col gap-4">
                    {navLinks.map(({ label, path }) => (
                        <Link
                            key={label}
                            to={path}
                            onClick={() => setMenuOpen(false)}
                            className={`text-sm font-medium transition-colors cursor-pointer ${getIsActive(path) ? "text-white" : "text-white/70 hover:text-white"}`}>
                            {label}
                        </Link>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button className="flex-1 inline-flex items-center justify-center gap-2 px-4 h-9 rounded bg-blue-accent text-white text-sm font-semibold cursor-pointer">
                            <FileText size={14} /> Relatório
                        </button>
                        {isAuthenticated && (
                            <button
                                onClick={() => { logout(); navigate("/"); setMenuOpen(false); }}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 h-9 rounded bg-red-dark text-white text-sm font-semibold cursor-pointer">
                                <LogOut size={14} /> Sair
                            </button>
                        )}
                    </div>
                </div>
            )}

        </header>
    );
};