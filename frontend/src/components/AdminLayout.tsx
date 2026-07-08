import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

const adminLinks = [
  { label: "📊 Dashboard", path: "/admin" },
  { label: "🚂 Passeios", path: "/admin/passeios" },
  { label: "👤 Clientes", path: "/admin/clientes" },
  { label: "📅 Agendamentos", path: "/admin/agendamentos" },
  { label: "⭐ Avaliações", path: "/admin/avaliacoes" },
  { label: "🔐 Usuários", path: "/admin/usuarios" },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[#f2f3fb]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d2340] text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10">
          <Link to="/admin" className="text-lg font-bold tracking-tight">Vagoneteiros Admin</Link>
          <p className="text-xs text-white/50 mt-1">{user?.name}</p>
        </div>

        <nav className="flex-1 p-3 flex flex-col gap-1">
          {adminLinks.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          <Link
            to="/"
            className="text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            ← Ver site
          </Link>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="text-xs text-[#b61722]/80 hover:text-[#b61722] text-left transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
