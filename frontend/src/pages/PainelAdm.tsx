import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, CheckCircle, DollarSign, Star,
  Plus, Pencil, Trash2, Filter, ChevronLeft,
  ChevronRight, UserCheck, Ticket, Power, PowerOff
} from "lucide-react";
import { api } from "../services/api";

interface Vagoneteiro {
  id: number;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string;
  historico: string | null;
  experiencia: string | null;
  ativo: boolean;
  foto: string | null;
  data_associacao: string;
  _count: { passeios: number };
}

interface VagoneteirosResponse {
  data: Vagoneteiro[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Passeio {
  id: number;
  preco: number;
  capacidade: number;
  data: string;
  horario: string;
  usuario: { id: number; name: string };
}

interface Cliente {
  id: number;
  nome: string;
  cpf: string;
  telefone: string;
  email: string | null;
}

interface Agendamento {
  id: number;
  status: "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "REMARCADO";
  createdAt: string;
  cliente: { id: number; nome: string; cpf: string };
  passeio: {
    id: number;
    data: string;
    preco: number;
    capacidade: number;
    horario: string;
    usuario: { id: number; name: string };
  };
}

interface Avaliacao {
  id: number;
  nota: number;
  comentario: string;
  clienteId: number;
  passeioId: number;
}

const formatData = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const formatHorario = (horario: string) => horario;

const statusConfig: Record<string, { label: string; pill: string; dot: string }> = {
  CONFIRMADO: { label: "Confirmado", pill: "bg-blue-accent/10 text-blue-accent border border-blue-accent/25", dot: "bg-blue-accent" },
  CONFIRMADA: { label: "Confirmado", pill: "bg-blue-accent/10 text-blue-accent border border-blue-accent/25", dot: "bg-blue-accent" },
  COMPLETO: { label: "Completo", pill: "bg-green-timeline/10 text-green-timeline border border-green-timeline/25", dot: "bg-green-timeline" },
  CANCELADO: { label: "Cancelado", pill: "bg-red-dark/10 text-red-dark border border-red-dark/25", dot: "bg-red-dark" },
  CANCELADA: { label: "Cancelado", pill: "bg-red-dark/10 text-red-dark border border-red-dark/25", dot: "bg-red-dark" },
  PENDENTE: { label: "Pendente", pill: "bg-amber-500/10 text-amber-500 border border-amber-500/25", dot: "bg-amber-500" },
  REMARCADO: { label: "Remarcado", pill: "bg-purple-500/10 text-purple-500 border border-purple-500/25", dot: "bg-purple-500" },
  "AGUARDANDO APROVAÇÃO": { label: "Aguardando Aprovação", pill: "bg-amber-500/10 text-amber-500 border border-amber-500/25", dot: "bg-amber-500" },
};

const CARDS_POR_PAGINA = 3;
const VAG_POR_PAGINA = 9;

interface GrupoAgenda {
  id_passeio: number;
  passeio: Passeio;
  registros: Agendamento[];
}

function groupAgendaByPasseio(agenda: Agendamento[], passeios: Passeio[]): GrupoAgenda[] {
  const map = new Map<number, Agendamento[]>();
  agenda.forEach(a => {
    if (!map.has(a.passeio.id)) map.set(a.passeio.id, []);
    map.get(a.passeio.id)!.push(a);
  });
  return Array.from(map.entries()).map(([id_passeio, registros]) => {
    const passeio = passeios.find(p => p.id === id_passeio);
    return { id_passeio, passeio: passeio!, registros };
  }).filter(g => g.passeio);
}

export const PainelAdmin: React.FC = () => {
  const navigate = useNavigate();

  const [pagina, setPagina] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [paginaVag, setPaginaVag] = useState(1);
  const [vagoneteirosData, setVagoneteirosData] = useState<VagoneteirosResponse | null>(null);
  const [vagLoading, setVagLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const [passeios, setPasseios] = useState<Passeio[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    carregarVagoneteiros(1);
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoadingData(true);
    try {
      const [p, a, av, c] = await Promise.all([
        api.request<Passeio[]>("/passeios"),
        api.request<Agendamento[]>("/agendamentos"),
        api.request<Avaliacao[]>("/avaliacoes"),
        api.request<Cliente[]>("/clientes"),
      ]);
      setPasseios(p);
      setAgendamentos(a);
      setAvaliacoes(av);
      setClientes(c);
    } catch {
      // api.request já trata erro
    }
    setLoadingData(false);
  }

  async function carregarVagoneteiros(page: number) {
    setVagLoading(true);
    try {
      const data = await api.request<VagoneteirosResponse>(`/usuarios/vagoneteiros?page=${page}&limit=${VAG_POR_PAGINA}`);
      setVagoneteirosData(data);
      setPaginaVag(page);
    } catch { /* api.request já trata erro */ }
    setVagLoading(false);
  }

  async function toggleAtivo(id: number) {
    setTogglingId(id);
    try {
      await api.request<{ id: number; name: string; ativo: boolean }>(`/usuarios/vagoneteiros/${id}/ativo`, { method: 'PATCH' });
      await carregarVagoneteiros(paginaVag);
    } catch { /* api.request já trata erro */ }
    setTogglingId(null);
  }

  // Estatísticas
  const agendamentosNaoCancelados = agendamentos.filter(a => a.status !== "CANCELADO");
  const passeiosRealizados = agendamentos.filter(a =>
    a.status === "CONFIRMADO" || a.status === "CONFIRMADA"
  ).length;
  const totalTuristas = agendamentosNaoCancelados.length;
  const receitaEstimada = agendamentosNaoCancelados.reduce((s, a) => s + Number(a.passeio.preco || 0), 0);
  const avaliacaoMedia = avaliacoes.length > 0
    ? (avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length).toFixed(1)
    : "0.0";

  const statCards = [
    { label: "Total de Turistas", value: totalTuristas, icon: Users, color: "text-blue-accent" },
    { label: "Passeios Realizados", value: String(passeiosRealizados), icon: CheckCircle, color: "text-green-timeline" },
    { label: "Receita Estimada", value: `R$ ${receitaEstimada.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-[#b61722]" },
    { label: "Avaliação Média", value: avaliacaoMedia, icon: Star, color: "text-amber-500" },
  ];

  // Filtro de agenda
  const agendaFiltrada = filtroStatus === "TODOS"
    ? agendamentos
    : agendamentos.filter(a => {
        if (filtroStatus === "ANDAMENTO") return a.status === "CONFIRMADO" || a.status === "PENDENTE";
        return a.status === filtroStatus;
      });

  const grupos = groupAgendaByPasseio(agendaFiltrada, passeios);
  const totalPaginas = Math.ceil(grupos.length / CARDS_POR_PAGINA);
  const gruposPaginados = grupos.slice((pagina - 1) * CARDS_POR_PAGINA, pagina * CARDS_POR_PAGINA);

  const vagPaginados = vagoneteirosData?.data || [];
  const totalPaginasVag = vagoneteirosData?.totalPages || 1;

  const getClienteNome = (id: number) => clientes.find(c => c.id === id)?.nome || `Cliente #${id}`;

  return (
    <div className="min-h-screen bg-bg-light-1 flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-10 flex flex-col gap-8">

        {/* Título */}
        <div className="flex items-center gap-3">
          <Users className="text-text-dark" size={28} strokeWidth={1.8} />
          <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
            Painel Administrativo
          </h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/cadastro?tipo=vagoneteiro"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-accent hover:bg-blue-dark text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus size={15} /> Cadastrar Vagoneteiro
          </Link>
          <Link
            to="/cadastro?tipo=administrador"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-dark hover:bg-red-hover text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus size={15} /> Cadastrar Administrador
          </Link>
          <Link
            to="/cadastro-passeio"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-bg-light-1 text-text-dark text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus size={15} /> Cadastrar Passeio
          </Link>
        </div>

        {/* Stat Cards */}
        {loadingData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-border animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#7a8394] tracking-widest uppercase">{label}</p>
                  <Icon size={16} className={`${color} opacity-60`} />
                </div>
                <p className={`font-bold text-2xl md:text-3xl tracking-tight ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Gestão de Passeios */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-border">
            <div>
              <h2 className="font-bold text-lg text-text-dark">Gestão de Passeios Disponíveis</h2>
              <p className="text-sm text-[#7a8394] mt-0.5">Gerencie os horários e vagas disponíveis</p>
            </div>
            <button
              onClick={() => navigate("/cadastro-passeio")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-accent hover:bg-blue-dark text-white text-sm font-semibold transition-colors cursor-pointer shrink-0">
              <Plus size={15} /> Cadastrar Novo Horário
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-bg-light-2">
                  {["Data / Hora", "Horário", "Valor", "Capacidade", "Vagoneteiro", "Ações"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-[#7a8394] tracking-widest uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#7a8394]">Carregando...</td></tr>
                ) : passeios.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#7a8394]">Nenhum passeio cadastrado</td></tr>
                ) : passeios.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-light-2 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-text-dark whitespace-nowrap">{formatData(p.data)}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-blue-accent/10 text-blue-accent border border-blue-accent/20 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                        {p.horario}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-timeline">R$ {Number(p.preco).toFixed(2).replace('.', ',')}</td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      <span className="font-bold">{String(p.capacidade).padStart(2, "0")}</span>
                      <span className="text-[#7a8394]"> vagas</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">{p.usuario?.name || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/editar-passeio/${p.id}`)}
                          className="text-[#7a8394] hover:text-blue-accent transition-colors cursor-pointer"
                          title="Editar passeio"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Tem certeza que deseja desativar o passeio #${p.id}?`)) return;
                            try {
                              await api.request(`/passeios/${p.id}`, { method: 'DELETE' });
                              setPasseios(prev => prev.filter(x => x.id !== p.id));
                            } catch { /* api.request já trata erro */ }
                          }}
                          className="text-[#7a8394] hover:text-red-dark transition-colors cursor-pointer"
                          title="Desativar passeio"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vagoneteiros + Histórico */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

          {/* Vagoneteiros */}
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-base text-text-dark">Vagoneteiros</h2>
              <Link
                to="/cadastro?tipo=vagoneteiro"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-accent hover:bg-blue-dark text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <UserCheck size={13} /> Cadastrar
              </Link>
            </div>
            <div className="flex flex-col divide-y divide-border flex-1">
              {vagLoading ? (
                <div className="flex items-center justify-center py-10 text-sm text-[#7a8394]">Carregando...</div>
              ) : vagPaginados.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-[#7a8394]">Nenhum vagoneteiro cadastrado</div>
              ) : vagPaginados.map((v, i) => (
                <div key={`${v.id}-${i}`} className="flex items-center gap-2 px-3 py-3 hover:bg-bg-light-2 transition-colors">
                  <Link to={`/admin/vagoneteiros/${v.id}`} className="shrink-0">
                    {v.foto ? (
                      <img src={`data:image/jpeg;base64,${v.foto}`} alt="" className="w-9 h-9 rounded-full object-cover" />
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
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    v.ativo
                      ? "bg-green-timeline/10 text-green-timeline border border-green-timeline/20"
                      : "bg-red-dark/10 text-red-dark border border-red-dark/20"
                  }`}>
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
              ))}
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <p className="text-xs text-[#7a8394]">Página {paginaVag} de {totalPaginasVag}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => carregarVagoneteiros(Math.max(1, paginaVag - 1))} disabled={paginaVag === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer">
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPaginasVag }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => carregarVagoneteiros(n)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors cursor-pointer ${paginaVag === n ? "bg-blue-accent text-white" : "border border-border text-text-primary hover:bg-bg-light-1"
                      }`}>{n}</button>
                ))}
                <button onClick={() => carregarVagoneteiros(Math.min(totalPaginasVag, paginaVag + 1))} disabled={paginaVag === totalPaginasVag}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Histórico de Agenda */}
          <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-bold text-base text-text-dark">Histórico de Agenda</h2>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-[#7a8394]" />
                <select
                  value={filtroStatus}
                  onChange={e => { setFiltroStatus(e.target.value); setPagina(1); }}
                  className="text-xs font-semibold text-text-primary bg-bg-light-1 border border-border rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none">
                  <option value="TODOS">Todos</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="CANCELADO">Cancelado</option>
                  <option value="COMPLETO">Completo</option>
                </select>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-0 divide-y divide-border flex-1 overflow-y-auto">
              {loadingData ? (
                <div className="flex items-center justify-center py-16 text-sm text-[#7a8394]">Carregando...</div>
              ) : gruposPaginados.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[#7a8394]">
                  <Ticket size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum registro encontrado</p>
                </div>
              )}

              {gruposPaginados.map(({ id_passeio, passeio, registros }) => {
                const vagasOcupadas = registros
                  .filter(r => r.status !== "CANCELADO")
                  .reduce((sum, r) => sum + 1, 0);

                return (
                  <div key={id_passeio} className="px-6 py-4">
                    {/* Cabeçalho do passeio */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/50">
                      <Ticket size={16} className="text-blue-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-dark">Passeio #{id_passeio}</p>
                        {passeio && (
                          <p className="text-xs text-[#7a8394] mt-0.5">
                            Data: {formatData(passeio.data)} às {passeio.horario} — Profissional: {passeio.usuario?.name}
                          </p>
                        )}
                      </div>
                      {passeio && (
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-text-primary">
                            {vagasOcupadas}/{passeio.capacidade}
                          </p>
                          <p className="text-xs text-[#7a8394]">Vagas Ocupadas</p>
                        </div>
                      )}
                    </div>

                    {/* Lista de reservas/clientes */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-text-dark mb-1">Clientes:</span>
                      {registros.length === 0 && (
                        <p className="text-xs text-[#7a8394] py-1">Nenhum cliente neste passeio</p>
                      )}
                      {registros.map(a => {
                        const sc = statusConfig[a.status] || statusConfig["PENDENTE"];
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-3 text-sm py-1.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                              <span className="truncate text-text-primary">
                                {a.cliente?.nome || `Cliente #${a.cliente?.id || "?"}`}
                              </span>
                            </div>
                            <span className="text-xs text-[#7a8394] shrink-0">1 vaga</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${sc.pill}`}>
                              {sc.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
                <p className="text-xs text-[#7a8394]">
                  Página {pagina} de {totalPaginas} — {grupos.length} passeio{grupos.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPagina(n)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors cursor-pointer ${pagina === n ? "bg-blue-accent text-white" : "border border-border text-text-primary hover:bg-bg-light-1"
                        }`}>{n}</button>
                  ))}
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};
