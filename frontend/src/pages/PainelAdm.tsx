import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, CheckCircle, DollarSign, Star,
  Plus, Pencil, Trash2, Filter, ChevronLeft,
  ChevronRight, UserCheck, Ticket
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

const mockClientes = [
  { id: 1, nome: "Pedro Alves", telefone: "(51) 99811-0001", tipo: "PF", documento: "111.222.333-44" },
  { id: 2, nome: "Lucia Martins", telefone: "(51) 99811-0002", tipo: "PF", documento: "222.333.444-55" },
  { id: 3, nome: "Rafael Costa", telefone: "(11) 99811-0003", tipo: "PJ", documento: "12.345.678/0001-90" },
  { id: 4, nome: "Fernanda Lima", telefone: "(41) 99811-0004", tipo: "PF", documento: "333.444.555-66" },
  { id: 5, nome: "Bruno Mendes", telefone: "(21) 99811-0005", tipo: "PF", documento: "444.555.666-77" },
];

const mockPasseios = [
  { id: 1, valor: 100, capacidade: 5, data_hora: "2025-03-18T09:00:00", id_vagoneteiro: 1 },
  { id: 2, valor: 100, capacidade: 5, data_hora: "2025-03-18T10:00:00", id_vagoneteiro: 2 },
  { id: 3, valor: 100, capacidade: 5, data_hora: "2025-03-19T09:00:00", id_vagoneteiro: 1 },
  { id: 4, valor: 100, capacidade: 5, data_hora: "2025-03-19T14:00:00", id_vagoneteiro: 4 },
];

const mockAgenda = [
  { id: 1, situacao: "COMPLETO", vagas: 2, data_horario: "2023-10-15T09:00:00", id_cliente: 1, id_passeio: 1 },
  { id: 2, situacao: "COMPLETO", vagas: 1, data_horario: "2023-10-15T13:30:00", id_cliente: 2, id_passeio: 2 },
  { id: 3, situacao: "COMPLETO", vagas: 3, data_horario: "2023-10-14T10:00:00", id_cliente: 3, id_passeio: 1 },
  { id: 4, situacao: "COMPLETO", vagas: 1, data_horario: "2023-10-14T15:00:00", id_cliente: 4, id_passeio: 3 },
  { id: 5, situacao: "CANCELADO", vagas: 3, data_horario: "2023-10-13T08:30:00", id_cliente: 5, id_passeio: 2 },
  { id: 6, situacao: "CONFIRMADA", vagas: 2, data_horario: "2023-10-16T09:00:00", id_cliente: 1, id_passeio: 4 },
  { id: 7, situacao: "AGUARDANDO APROVAÇÃO", vagas: 1, data_horario: "2023-10-16T14:00:00", id_cliente: 2, id_passeio: 4 },
];

const mockAvaliacoes = [
  { id: 1, nota: 5, comentario: "Experiência incrível! Recomendo muito.", id_passeio: 1, id_cliente: 1 },
  { id: 2, nota: 5, comentario: "Passeio maravilhoso, guia muito atencioso.", id_passeio: 2, id_cliente: 2 },
  { id: 3, nota: 4, comentario: "Muito bom, valeu cada centavo.", id_passeio: 3, id_cliente: 3 },
];



const formatData = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};
const formatHorario = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

const getVagoneteiro = (_id: number) => null;
const getCliente = (id: number) => mockClientes.find(c => c.id === id);
const getPasseio = (id: number) => mockPasseios.find(p => p.id === id);

const statusConfig: Record<string, { label: string; pill: string; dot: string }> = {
  CONFIRMADA: { label: "Confirmada", pill: "bg-blue-accent/10 text-blue-accent border border-blue-accent/25", dot: "bg-blue-accent" },
  COMPLETO: { label: "Completo", pill: "bg-green-timeline/10 text-green-timeline border border-green-timeline/25", dot: "bg-green-timeline" },
  CANCELADO: { label: "Cancelado", pill: "bg-red-dark/10 text-red-dark border border-red-dark/25", dot: "bg-red-dark" },
  "AGUARDANDO APROVAÇÃO": { label: "Aguardando Aprovação", pill: "bg-amber-500/10 text-amber-500 border border-amber-500/25", dot: "bg-amber-500" },
};

const passeiosRealizados = mockAgenda.filter(a => a.situacao === "COMPLETO").length;
const receitaEstimada = mockAgenda.filter(a => a.situacao !== "CANCELADA").length * 100;
const avaliacaoMedia = (mockAvaliacoes.reduce((s, a) => s + a.nota, 0) / mockAvaliacoes.length).toFixed(1);

const statCards = [
  { label: "Total de Turistas", value: mockAgenda.filter(a => a.situacao !== "CANCELADA").reduce((total, a) => total + a.vagas, 0), icon: Users, color: "text-blue-accent" },
  { label: "Passeios Realizados", value: String(passeiosRealizados), icon: CheckCircle, color: "text-green-timeline" },
  { label: "Receita Estimada", value: `R$ ${receitaEstimada.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-[#b61722]" },
  { label: "Avaliação Média", value: avaliacaoMedia, icon: Star, color: "text-amber-500" },
];

const CARDS_POR_PAGINA = 3;
const VAG_POR_PAGINA = 5;

const groupAgendaByPasseio = (agenda: typeof mockAgenda) => {
  const map = new Map<number, typeof mockAgenda>();
  agenda.forEach(a => {
    if (!map.has(a.id_passeio)) map.set(a.id_passeio, []);
    map.get(a.id_passeio)!.push(a);
  });
  return Array.from(map.entries()).map(([id_passeio, registros]) => ({ id_passeio, registros }));
};

export const PainelAdmin: React.FC = () => {
  const navigate = useNavigate();

  const [pagina, setPagina] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<string>("TODOS");
  const [paginaVag, setPaginaVag] = useState(1);
  const [vagoneteirosData, setVagoneteirosData] = useState<VagoneteirosResponse | null>(null);
  const [vagLoading, setVagLoading] = useState(true);

  useEffect(() => {
    carregarVagoneteiros(1);
  }, []);

  async function carregarVagoneteiros(page: number) {
    setVagLoading(true);
    try {
      const data = await api.request<VagoneteirosResponse>(`/usuarios/vagoneteiros?page=${page}&limit=${VAG_POR_PAGINA}`);
      setVagoneteirosData(data);
      setPaginaVag(page);
    } catch { /* api.request já trata erro */ }
    setVagLoading(false);
  }

  const agendaFiltrada = filtroStatus === "TODOS"
    ? mockAgenda
    : mockAgenda.filter(a => a.situacao === filtroStatus);

  const grupos = groupAgendaByPasseio(agendaFiltrada);
  const totalPaginas = Math.ceil(grupos.length / CARDS_POR_PAGINA);
  const gruposPaginados = grupos.slice((pagina - 1) * CARDS_POR_PAGINA, pagina * CARDS_POR_PAGINA);

  const vagPaginados = vagoneteirosData?.data || [];
  const totalPaginasVag = vagoneteirosData?.totalPages || 1;

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
                {mockPasseios.map((p) => {
                  const vag = getVagoneteiro(p.id_vagoneteiro);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg-light-2 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-text-dark whitespace-nowrap">{formatData(p.data_hora)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block bg-blue-accent/10 text-blue-accent border border-blue-accent/20 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                          {formatHorario(p.data_hora)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-timeline">R$ {p.valor},00</td>
                      <td className="px-6 py-4 text-sm text-text-primary">
                        <span className="font-bold">{String(p.capacidade).padStart(2, "0")}</span>
                        <span className="text-[#7a8394]"> vagas</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-primary">{(vag as any)?.nome ?? "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button className="text-[#7a8394] hover:text-blue-accent transition-colors cursor-pointer"><Pencil size={15} /></button>
                          <button className="text-[#7a8394] hover:text-red-dark transition-colors cursor-pointer"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <div key={`${v.id}-${i}`} className="flex items-center gap-3 px-6 py-4 hover:bg-bg-light-2 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-dark truncate">{v.name}</p>
                    <p className="text-xs text-[#7a8394]">{v.experiencia || '—'} de experiência</p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 bg-green-timeline/10 text-green-timeline border border-green-timeline/20">
                    Ativo
                  </span>
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
                  <option value="ANDAMENTO">Em andamento</option>
                  <option value="COMPLETO">Completo</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-0 divide-y divide-border flex-1 overflow-y-auto">
              {gruposPaginados.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-[#7a8394]">
                  <Ticket size={32} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum registro encontrado</p>
                </div>
              )}

              {gruposPaginados.map(({ id_passeio, registros }) => {
                const passeio = getPasseio(id_passeio);
                const vag = passeio ? getVagoneteiro(passeio.id_vagoneteiro) : null;

                return (
                  <div key={id_passeio} className="px-6 py-4">
                    {/* Cabeçalho do passeio */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/50">
                      <Ticket size={16} className="text-blue-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-dark">Passeio #{id_passeio}</p>
                        {passeio && vag && (
                          <p className="text-xs text-[#7a8394] mt-0.5">
                            Data: {formatData(passeio.data_hora)} às {formatHorario(passeio.data_hora)} - Profissional: {(vag as any)?.nome}
                          </p>
                        )}
                      </div>
                      {passeio && (
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-text-primary">
                            {registros.filter(r => r.situacao !== "CANCELADA").reduce((sum, r) => sum + r.vagas, 0)}/{passeio.capacidade}
                          </p>
                          <p className="text-xs text-[#7a8394]">Vagas Ocupadas</p>
                        </div>
                      )}
                    </div>

                    {/* Lista de reservas */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-text-dark">Clientes:</span>
                      {registros.map(a => {
                        const cliente = getCliente(a.id_cliente);
                        const sc = statusConfig[a.situacao] ?? statusConfig["COMPLETO"];
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-3 text-sm py-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                              <span className="truncate text-text-primary">{cliente?.nome ?? `Cliente #${a.id_cliente}`}</span>
                            </div>
                            <span className="text-xs text-[#7a8394] shrink-0">{a.vagas} vaga{a.vagas !== 1 ? "s" : ""}</span>
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