import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

export const Header: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();

    const navLinks = [
        { label: "Home", path: "/" },
        { label: "Galeria", path: "/galeria" },
        { label: "Agendar", path: "/agendamento" },
        { label: "História", path: "/historia" },
    ];

    return (
        <header className="w-full bg-[#0d2340] border-b border-white/10 sticky top-0 z-50">

            <nav className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 gap-8">
                <Link to="/" className="font-bold text-xl text-white tracking-tight shrink-0">
                    Vagoneteiros
                </Link>

                <ul className="hidden md:flex items-center gap-8">
                    {navLinks.map(({ label, path }) => {
                        const active = location.pathname === path;
                        return (
                            <li key={label}>
                                <Link
                                    to={path}
                                    className={`relative text-sm font-medium tracking-wide transition-colors cursor-pointer ${
                                        active ? "text-white" : "text-white/60 hover:text-white"
                                    }`}
                                >
                                    {label}
                                    {active && (
                                        <span className="absolute -bottom-[22px] left-0 right-0 h-[3px] bg-[#b61722] rounded-t-sm" />
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <div className="flex items-center gap-3 shrink-0">
                    <Link to="/agendamento" className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-[#1878c1] hover:bg-[#1265a8] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                        Agendar
                    </Link>

                    {user ? (
                        <>
                            {['ADMIN', 'REDATOR'].includes(user.perfil) && (
                                <Link to="/admin" className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-[#1878c1] hover:bg-[#1265a8] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                                    Admin
                                </Link>
                            )}
                            <button onClick={logout} className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                                Sair
                            </button>
                        </>
                    ) : (
                        <Link to="/entrar" className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-[#b61722] hover:bg-[#9e1320] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                            Entrar
                        </Link>
                    )}

                    <button
                        className="md:hidden flex items-center justify-center w-9 h-9 text-white/60 hover:text-white transition-colors cursor-pointer"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Menu"
                    >
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
                <div className="md:hidden bg-[#0d2340] border-t border-white/10 px-4 py-4 flex flex-col gap-4">
                    {navLinks.map(({ label, path }) => (
                        <Link
                            key={label}
                            to={path}
                            onClick={() => setMenuOpen(false)}
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer"
                        >
                            {label}
                        </Link>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <Link to="/agendar" className="flex-1 text-center px-4 h-9 rounded bg-[#1878c1] text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                            Agendar
                        </Link>
                        <Link to="/entrar" className="flex-1 text-center px-4 h-9 rounded bg-[#b61722] text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                            Entrar
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
};