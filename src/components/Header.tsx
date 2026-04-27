import React, { useState } from "react";

export const Header: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="w-full bg-[#0d2340] border-b border-white/10 sticky top-0 z-50">

            <nav className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16 gap-8">
                <a href="/" className="font-bold text-xl text-white tracking-tight shrink-0">
                    Vagoneteiros
                </a>

                <ul className="hidden md:flex items-center gap-8">
                    {[
                        { label: "Home", active: true },
                        { label: "Galeria" },
                        { label: "Agendar" },
                        { label: "História" },
                    ].map(({ label, active }) => (
                        <li key={label}>
                            <a
                                href="#"
                                className={`relative text-sm font-medium tracking-wide transition-colors cursor-pointer ${active ? "text-white" : "text-white/60 hover:text-white"
                                    }`}
                            >
                                {label}
                                {active && (
                                    <span className="absolute -bottom-[22px] left-0 right-0 h-[3px] bg-[#b61722] rounded-t-sm" />
                                )}
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-3 shrink-0">
                    <a href="#" className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-[#1878c1] hover:bg-[#1265a8] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer" >
                        Agendar
                    </a>
                    <a href="#" className="hidden sm:inline-flex items-center justify-center px-5 h-9 rounded bg-[#b61722] hover:bg-[#9e1320] text-white text-sm font-semibold tracking-wide transition-colors cursor-pointer">
                        Entrar
                    </a>


                    {/*celular */}
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

            {/* celular menu */}
            {menuOpen && (
                <div className="md:hidden bg-[#0d2340] border-t border-white/10 px-4 py-4 flex flex-col gap-4">
                    {["Home", "Galeria", "Agendar", "História"].map((label) => (
                        <a key={label} href="#" className="text-sm font-medium text-white/70 hover:text-white transition-colors cursor-pointer">
                            {label}
                        </a>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <a href="#" className="flex-1 text-center px-4 h-9 rounded bg-[#1878c1] text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                            Agendar
                        </a>
                        <a href="#" className="flex-1 text-center px-4 h-9 rounded bg-[#b61722] text-white text-sm font-semibold flex items-center justify-center cursor-pointer">
                            Entrar
                        </a>
                    </div>
                </div>
            )}
        </header>
    );
};