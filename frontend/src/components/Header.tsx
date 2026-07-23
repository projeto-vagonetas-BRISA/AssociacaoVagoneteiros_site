import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Train } from "lucide-react";
import { LoginPopUp } from "../components/LoginPopUp";
import { useAuth } from "../contexts/AuthContext";

export const Header: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const toggleLoginOpen = () => {
        setLoginOpen(prev => !prev);
    };
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated, isAdmin, isVagoneteiro, logout } = useAuth();

    const navLinks = [
        { label: "Home", path: "/" },
        { label: "Galeria", path: "/galeria" },
        { label: "Agendar", path: "/agendamento" },
        { label: "Consultar", path: "/consulta-agendamento" },
        { label: "História", path: "/historia" },
        { label: "Investimento", path: "/investimento" },
    ];

    return (
        <header className="w-full bg-blue-dark border-b border-white/10 sticky top-0 z-50">

            <nav className="relative max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 gap-8">
                <Link to="/" className="font-bold text-lg text-white tracking-tight shrink-0">
                    Vagoneteiros dos Molhes da Barra
                </Link>

                {/* Links de navegação: ocultos quando vagoneteiro está logado */}
                {!isVagoneteiro && (
                    <ul className="hidden md:flex items-center gap-8">
                        {navLinks.map(({ label, path }) => {
                            const active = location.pathname === path;
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
                )}

                <div className="flex items-center gap-3 shrink-0">
                    {/* Botão Agendar: oculto quando vagoneteiro está logado */}
                    {!isVagoneteiro && (
                        <Link to="/agendamento" className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-blue-accent hover:bg-blue-accent/80 text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                            Agendar
                        </Link>
                    )}

                    {isAuthenticated ? (
                        <>
                            {/* Avatar: oculto para vagoneteiro */}
                            {!isVagoneteiro && (
                                <div className="hidden sm:flex items-center gap-2 text-sm text-white/70">
                                    <span className="w-7 h-7 rounded-full bg-blue-accent flex items-center justify-center text-xs font-bold text-white">
                                        {user?.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="text-white/80">{user?.name.split(' ')[0]}</span>
                                </div>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => navigate("/painel-admin")}
                                    className="hidden sm:inline-flex items-center justify-center px-4 h-9 rounded bg-blue-accent hover:bg-blue-accent/80 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer">
                                    Painel ADM
                                </button>
                            )}
                            {isVagoneteiro && (
                                <button
                                    onClick={() => navigate("/feed-vagoneteiro")}
                                    className="hidden sm:inline-flex items-center gap-1.5 justify-center px-4 h-9 rounded bg-blue-accent hover:bg-blue-accent/80 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer">
                                    <Train size={14} />
                                    Feed do Vagoneteiro
                                </button>
                            )}
                            <button
                                onClick={() => { logout(); navigate("/"); }}
                                className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-red-dark hover:bg-red-hover text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                                Sair
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => toggleLoginOpen()}
                            className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-red-dark hover:bg-red-hover text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                            Entrar
                        </button>
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
                {loginOpen && <LoginPopUp onClose={() => toggleLoginOpen()} />}
            </nav>

            {menuOpen && (
                <div className="md:hidden bg-blue-dark border-t border-white/10 px-4 py-4 flex flex-col gap-4">
                    {/* Menu mobile: simplificado para vagoneteiro */}
                    {isVagoneteiro ? (
                        <div className="flex gap-3">
                            <button
                                onClick={() => { navigate("/feed-vagoneteiro"); setMenuOpen(false); }}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded bg-blue-accent text-white text-sm font-semibold cursor-pointer">
                                <Train size={14} />
                                Feed do Vagoneteiro
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); logout(); navigate("/"); setMenuOpen(false); }}
                                className="flex-1 text-center px-4 h-9 rounded bg-red-dark text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                                Sair
                            </button>
                        </div>
                    ) : (
                        <>
                            {navLinks.map(({ label, path }) => (
                                <Link
                                    key={label}
                                    to={path}
                                    onClick={() => setMenuOpen(false)}
                                    className="text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer">
                                    {label}
                                </Link>
                            ))}
                            {isAdmin && (
                                <Link
                                    to="/painel-admin"
                                    onClick={() => setMenuOpen(false)}
                                    className="text-sm font-medium text-blue-accent hover:text-white transition-colors cursor-pointer">
                                    Painel Administrativo
                                </Link>
                            )}
                            <div className="flex gap-3 pt-2">
                                <Link to="/agendamento" className="flex-1 text-center px-4 h-9 rounded bg-blue-accent text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                                    Agendar
                                </Link>
                                <Link to="/consulta-agendamento" onClick={() => setMenuOpen(false)} className="flex-1 text-center px-4 h-9 rounded bg-white/10 border border-white/10 text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                                    Consultar
                                </Link>
                                {isAuthenticated ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); logout(); navigate("/"); setMenuOpen(false); }}
                                        className="flex-1 text-center px-4 h-9 rounded bg-red-dark text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                                        Sair
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleLoginOpen(); setMenuOpen(false); }}
                                        className="flex-1 text-center px-4 h-9 rounded bg-red-dark text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                                        Entrar
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

        </header>
    );
};