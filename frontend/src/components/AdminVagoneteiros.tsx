import React from "react";
import { Link } from "react-router-dom";
import { UserCheck } from "lucide-react";

interface Vagoneteiro {
  id: number;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string;
  ativo: boolean;
}

interface VagoneteirosResponse {
  data: Vagoneteiro[];
  page: number;
  totalPages: number;
  total: number;
}

interface Props {
  vagoneteirosData: VagoneteirosResponse | null;
  carregarVagoneteiros: (p: number) => void;
  paginaVag: number;
  vagLoading: boolean;
  toggleAtivo: (id: number) => void;
  togglingId: number | null;
}

export const AdminVagoneteiros: React.FC<Props> = ({ vagoneteirosData, carregarVagoneteiros, paginaVag, vagLoading, toggleAtivo, togglingId }) => {
  const vagas = vagoneteirosData?.data || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-dark">Vagoneteiros</h3>
          <p className="text-xs text-text-secondary">Gerencie perfis e status</p>
        </div>
        <Link
          to="/cadastro?tipo=vagoneteiro"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-accent hover:bg-blue-dark text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <UserCheck size={13} /> Cadastrar
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-border flex-1">
        {vagLoading ? (
          <div className="p-6">Carregando...</div>
        ) : vagas.length === 0 ? (
          <div className="p-6 text-text-secondary">Nenhum vagoneteiro encontrado.</div>
        ) : (
          vagas.map(v => (
            <div key={v.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium text-text-dark">{v.name}</p>
                <p className="text-xs text-text-secondary">{v.cpf} — {v.telefone}</p>
              </div>
              <div>
                <button
                  onClick={() => toggleAtivo(v.id)}
                  disabled={togglingId === v.id}
                  className={`px-3 py-1 rounded-lg text-sm font-semibold ${v.ativo ? 'bg-green-timeline/10 text-green-timeline border border-green-timeline/20' : 'bg-gray-100 text-text-primary border border-border'} transition-colors`}
                >
                  {v.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <p className="text-xs text-text-secondary">
          Página {paginaVag} de {vagoneteirosData?.totalPages || 1} — {vagoneteirosData?.total || 0} cadastro(s)
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => carregarVagoneteiros(Math.max(1, paginaVag - 1))} className="px-3 py-1 border rounded" disabled={paginaVag === 1}>Anterior</button>
          <button onClick={() => carregarVagoneteiros(Math.min(vagoneteirosData?.totalPages || 1, paginaVag + 1))} className="px-3 py-1 border rounded" disabled={(vagoneteirosData?.totalPages || 1) === paginaVag}>Próxima</button>
        </div>
      </div>
    </div>
  );
};
