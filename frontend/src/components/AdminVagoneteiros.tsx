import React from "react";
import { Link } from "react-router-dom";
import { UserCheck, PowerOff, Power } from "lucide-react";

interface Usuario {
  id: number;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string;
  ativo: boolean;
  foto?: string | null;
}

interface UsuariosResponse {
  data: Usuario[];
  page: number;
  totalPages: number;
  total: number;
}

interface Props {
  vagoneteirosData: UsuariosResponse | null;
  carregarVagoneteiros: (p: number, tipo?: 'VAGONETEIRO' | 'ADMIN') => void;
  paginaVag: number;
  vagLoading: boolean;
  toggleAtivo: (id: number) => void;
  togglingId: number | null;
  tipoUsuario: 'VAGONETEIRO' | 'ADMIN';
  setTipoUsuario: (t: 'VAGONETEIRO' | 'ADMIN') => void;
}

function renderPaginacao(
  paginaAtual: number,
  totalPaginas: number,
  onPage: (p: number) => void
) {
  return Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
    <button
      key={p}
      onClick={() => onPage(p)}
      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
        p === paginaAtual
          ? "bg-blue-accent text-white"
          : "bg-bg-light-1 text-text-secondary hover:bg-bg-light-2"
      }`}
    >
      {p}
    </button>
  ));
}

export const AdminVagoneteiros: React.FC<Props> = ({
  vagoneteirosData,
  carregarVagoneteiros,
  paginaVag,
  vagLoading,
  toggleAtivo,
  togglingId,
  tipoUsuario,
  setTipoUsuario,
}) => {
  const vagPaginados = vagoneteirosData?.data || [];
  const totalPaginasVag = vagoneteirosData?.totalPages || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden flex flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <select
            value={tipoUsuario}
            onChange={e => {
              const t = e.target.value as 'VAGONETEIRO' | 'ADMIN';
              setTipoUsuario(t);
              carregarVagoneteiros(1, t);
            }}
            className="text-sm font-bold text-base text-text-dark bg-bg-light-1 border border-border rounded-lg px-2 py-1 cursor-pointer focus:outline-none"
          >
            <option value="VAGONETEIRO">Vagoneteiros</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
        <Link
          to="/cadastro?tipo=vagoneteiro"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-accent hover:bg-blue-dark text-white text-xs font-semibold transition-colors cursor-pointer"
        >
          <UserCheck size={13} /> Cadastrar
        </Link>
      </div>

      {/* Lista */}
      <div className="flex flex-col divide-y divide-border flex-1">
        {vagLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-[#7a8394]">
            Carregando...
          </div>
        ) : vagPaginados.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-[#7a8394]">
            {tipoUsuario === 'VAGONETEIRO'
              ? 'Nenhum vagoneteiro cadastrado'
              : 'Nenhum administrador cadastrado'}
          </div>
        ) : (
          vagPaginados.map((v, i) => (
            <div
              key={`${v.id}-${i}`}
              className="flex items-center gap-2 px-3 py-3 hover:bg-bg-light-2 transition-colors"
            >
              <Link to={`/admin/vagoneteiros/${v.id}`} className="shrink-0">
                {v.foto ? (
                  <img
                    src={`data:image/jpeg;base64,${v.foto}`}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-accent/20 text-blue-accent flex items-center justify-center text-sm font-bold">
                    {v.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <Link to={`/admin/vagoneteiros/${v.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark truncate">{v.name}</p>
                <p className="text-xs text-[#7a8394] truncate">{v.telefone}</p>
              </Link>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  v.ativo
                    ? "bg-green-timeline/10 text-green-timeline border border-green-timeline/20"
                    : "bg-red-dark/10 text-red-dark border border-red-dark/20"
                }`}
              >
                {v.ativo ? "Ativo" : "Inativo"}
              </span>
              <button
                onClick={() => toggleAtivo(v.id)}
                disabled={togglingId === v.id}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  v.ativo
                    ? "text-green-timeline hover:bg-green-timeline/10"
                    : "text-[#7a8394] hover:bg-red-dark/10 hover:text-red-dark"
                } disabled:opacity-40`}
                title={v.ativo ? "Desativar" : "Ativar"}
              >
                {togglingId === v.id ? (
                  <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : v.ativo ? (
                  <PowerOff size={14} />
                ) : (
                  <Power size={14} />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <p className="text-xs text-[#7a8394]">
          Página {paginaVag} de {totalPaginasVag}
        </p>
        <div className="flex items-center gap-1">
          {renderPaginacao(paginaVag, totalPaginasVag, p =>
            carregarVagoneteiros(p, tipoUsuario)
          )}
        </div>
      </div>
    </div>
  );
};
