import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShieldCheck, CalendarDays } from "lucide-react";
import { authService } from "../services/auth";

export const AdminQuickActions: React.FC = () => {
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        let active = true;
        authService.listResetRequests()
            .then((solicitacoes) => {
                if (active) setPendingCount(solicitacoes.length);
            })
            .catch(() => {
                if (active) setPendingCount(0);
            });
        return () => { active = false; };
    }, []);

    return (
        <div className="flex flex-wrap gap-3">
            <Link
                to="/cadastro?tipo=vagoneteiro"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-accent hover:bg-blue-dark text-white text-sm font-semibold transition-colors cursor-pointer"
            >
                <Plus size={15} /> Cadastrar Vagoneteiro
            </Link>
            <Link
                to="/cadastro?tipo=administrador"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-bg-light-1 text-text-dark text-sm font-semibold transition-colors cursor-pointer"
            >
                <Plus size={15} /> Cadastrar Administrador
            </Link>
            <Link
                to="/admin/slots"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-bg-light-1 text-text-dark text-sm font-semibold transition-colors cursor-pointer"
            >
                <CalendarDays size={15} /> Gerenciar Horários
            </Link>
            <Link
                to="/admin/reset-requests"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-bg-light-1 text-text-dark text-sm font-semibold transition-colors cursor-pointer"
            >
                <ShieldCheck size={15} /> Solicitações de Reset
                {pendingCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-red-dark px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        {pendingCount}
                    </span>
                )}
            </Link>
        </div>
    );
};
