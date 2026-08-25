import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, CheckCircle, DollarSign, Star, BarChart3,
  Plus, Pencil, Trash2, Filter, ChevronLeft,
  ChevronRight, ChevronsRight, UserCheck, Ticket, Power, PowerOff,
  RefreshCw, Calendar, CalendarDays, LineChart, SlidersHorizontal, X, CalendarX2, Loader2, PauseCircle, PlayCircle, Ban, ShieldCheck, Search, UserX
} from "lucide-react";
import { api } from "../services/api";
import { DashboardProvider } from "../components/dashboard/DashboardProvider";
import { AdminQuickActions } from "../components/AdminQuickActions";
import { AdminVagoneteiros } from "../components/AdminVagoneteiros";
import { PasseiosTable } from "../components/PasseiosTable";
import { formatBRL } from "../utils/format";
import { exportarCSV } from "../utils/csv";

const MAX_PAG_VISIVEIS = 20;

function renderPaginacao(
  atual: number,
  total: number,
  onChange: (p: number) => void
) {
  if (total <= 1) return null;

  const botoes: React.ReactNode[] = [];

  // Botão anterior
  botoes.push(
    <button key="prev" onClick={() => onChange(Math.max(1, atual - 1))}
      disabled={atual === 1}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer">
      <ChevronLeft size={14} />
    </button>
  );

  if (total <= MAX_PAG_VISIVEIS) {
    // Até 20 páginas: mostra todas
    for (let n = 1; n <= total; n++) {
      botoes.push(botaoPagina(n, atual, onChange));
    }
  } else {
    // Mais de 20: mostra primeiro bloco + seta, ou bloco atual + navegação
    const blocoAtual = Math.ceil(atual / MAX_PAG_VISIVEIS);
    const totalBlocos = Math.ceil(total / MAX_PAG_VISIVEIS);
    const inicio = (blocoAtual - 1) * MAX_PAG_VISIVEIS + 1;
    const fim = Math.min(blocoAtual * MAX_PAG_VISIVEIS, total);

    for (let n = inicio; n <= fim; n++) {
      botoes.push(botaoPagina(n, atual, onChange));
    }

    // Seta para próximo bloco (se houver)
    if (blocoAtual < totalBlocos) {
      botoes.push(
        <button key="next-block" onClick={() => onChange(fim + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 transition-colors cursor-pointer">
          <ChevronsRight size={14} />
        </button>
      );
    }
  }

  // Botão próximo
  botoes.push(
    <button key="next" onClick={() => onChange(Math.min(total, atual + 1))}
      disabled={atual === total}
      className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer">
      <ChevronRight size={14} />
    </button>
  );

  return botoes;
}

function botaoPagina(n: number, atual: number, onChange: (p: number) => void) {
  return (
    <button key={n} onClick={() => onChange(n)}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors cursor-pointer ${atual === n ? "bg-blue-accent text-white" : "border border-border text-text-primary hover:bg-bg-light-1"}`}
    >{n}</button>
  );
}

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
  status?: string;
  usuario: { id: number; name: string };
}

interface PasseiosResponse {
  data: Passeio[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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
  status: "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "REMARCADO" | "REALIZADO";
  createdAt: string;
  acompanhantes: number;
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
  // Usa T12:00:00 (sem Z = local) para evitar off-by-one por timezone
  const datePart = iso.split('T')[0];
  const d = new Date(`${datePart}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const formatHorario = (horario: string) => horario;

const statusConfig: Record<string, { label: string; pill: string; dot: string }> = {
  CONFIRMADO: { label: "Confirmado", pill: "bg-blue-accent/10 text-blue-accent border border-blue-accent/25", dot: "bg-blue-accent" },
  CONFIRMADA: { label: "Confirmado", pill: "bg-blue-accent/10 text-blue-accent border border-blue-accent/25", dot: "bg-blue-accent" },
  COMPLETO: { label: "Completo", pill: "bg-green-timeline/10 text-green-timeline border border-green-timeline/25", dot: "bg-green-timeline" },
  REALIZADO: { label: "Realizado", pill: "bg-green-timeline/10 text-green-timeline border border-green-timeline/25", dot: "bg-green-timeline" },
  CANCELADO: { label: "Cancelado", pill: "bg-red-dark/10 text-red-dark border border-red-dark/25", dot: "bg-red-dark" },
  CANCELADA: { label: "Cancelado", pill: "bg-red-dark/10 text-red-dark border border-red-dark/25", dot: "bg-red-dark" },
  PENDENTE: { label: "Pendente", pill: "bg-amber-500/10 text-amber-500 border border-amber-500/25", dot: "bg-amber-500" },
  REMARCADO: { label: "Remarcado", pill: "bg-purple-500/10 text-purple-500 border border-purple-500/25", dot: "bg-purple-500" },
  "AGUARDANDO APROVAÇÃO": { label: "Aguardando Aprovação", pill: "bg-amber-500/10 text-amber-500 border border-amber-500/25", dot: "bg-amber-500" },
};

const CARDS_POR_PAGINA = 2;
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
  const [tipoUsuario, setTipoUsuario] = useState<'VAGONETEIRO' | 'ADMIN'>('VAGONETEIRO');

  const [passeiosData, setPasseiosData] = useState<PasseiosResponse | null>(null);
  const [paginaPasseio, setPaginaPasseio] = useState(1);

  // Todos os passeios para o Histórico — carregado separadamente para não conflitar com a paginação da tabela
  const [todosPasseios, setTodosPasseios] = useState<Passeio[]>([]);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [resumoPainel, setResumoPainel] = useState<{ totalTuristas: number; passeiosRealizados: number; receitaEstimada: number } | null>(null);
  const [avaliacaoCache, setAvaliacaoCache] = useState<{ avaliacaoMedia: number; totalAvaliacoes: number; atualizadaEm: string | null } | null>(null);
  const [modalAvaliacao, setModalAvaliacao] = useState(false);
  const [editNota, setEditNota] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false);
  const [modalRelatorio, setModalRelatorio] = useState<{ open: boolean; inicio: string; fim: string; preset: string }>({ open: false, inicio: '', fim: '', preset: 'mensal' });
  const [modalCancelamentoMassa, setModalCancelamentoMassa] = useState<{
    open: boolean; inicio: string; fim: string; motivo: string;
    carregando: boolean; resultado: string | null; erro: string | null;
  }>({ open: false, inicio: '', fim: '', motivo: '', carregando: false, resultado: null, erro: null });

  // Data mínima selecionável no modal (hoje, fuso local) — inibe dias passados
  const hoje = new Date();
  const dataMinimaHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const cancelarEmMassa = async () => {
    const { inicio, fim, motivo } = modalCancelamentoMassa;
    if (!inicio || !fim) return;
    setModalCancelamentoMassa(m => ({ ...m, carregando: true, erro: null, resultado: null }));
    try {
      const resp = await api.request<{ message: string; cancelados: number }>('/agendamentos/cancelar-em-massa', {
        method: 'POST',
        body: JSON.stringify({ dataInicio: inicio, dataFim: fim, motivo: motivo || undefined }),
      });
      setModalCancelamentoMassa(m => ({
        ...m,
        carregando: false,
        resultado: resp.message,
      }));
      await carregarDados();
    } catch (e: any) {
      setModalCancelamentoMassa(m => ({
        ...m,
        carregando: false,
        erro: e?.message || 'Erro ao cancelar em massa. Tente novamente.',
      }));
    }
  };

  // ---- Suspensão de atividades ----
  type Suspensao = {
    id: number;
    dataInicio: string;
    dataFim: string;
    motivo: string | null;
    ativa: boolean;
    criadoEm: string;
  };
  const [suspensoes, setSuspensoes] = useState<Suspensao[]>([]);
  const [filtroSuspensao, setFiltroSuspensao] = useState<'ativas' | 'todas' | 'removidas'>('ativas');
  const [modalSuspensao, setModalSuspensao] = useState<{
    open: boolean; inicio: string; fim: string; motivo: string;
    carregando: boolean; erro: string | null; resultado: string | null;
  }>({ open: false, inicio: '', fim: '', motivo: '', carregando: false, erro: null, resultado: null });
  const [removendoSuspensaoId, setRemovendoSuspensaoId] = useState<number | null>(null);

  const carregarSuspensoes = async () => {
    try {
      const resp = await api.request<{ suspensoes: any[] }>('/suspensoes');
      setSuspensoes(resp.suspensoes ?? []);
    } catch { }
  };

  useEffect(() => { carregarSuspensoes(); }, []);

  const criarSuspensao = async () => {
    const { inicio, fim, motivo } = modalSuspensao;
    if (!inicio || !fim) return;
    setModalSuspensao(m => ({ ...m, carregando: true, erro: null, resultado: null }));
    try {
      const resp = await api.request<{ message: string }>('/suspensoes', {
        method: 'POST',
        body: JSON.stringify({ dataInicio: inicio, dataFim: fim, motivo: motivo || undefined }),
      });
      setModalSuspensao(m => ({ ...m, carregando: false, resultado: resp.message }));
      await carregarSuspensoes();
      await carregarDados();
    } catch (e: any) {
      setModalSuspensao(m => ({
        ...m,
        carregando: false,
        erro: e?.message || 'Erro ao suspender período. Tente novamente.',
      }));
    }
  };

  const removerSuspensao = async (id: number) => {
    if (!confirm(`Remover a suspensão deste período? Os agendamentos voltarão ao status anterior.`)) return;
    setRemovendoSuspensaoId(id);
    try {
      await api.request(`/suspensoes/${id}`, { method: 'DELETE' });
      await carregarSuspensoes();
      await carregarDados();
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover suspensão.');
    }
    setRemovendoSuspensaoId(null);
  };

  const formatarDataSuspensao = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // ---- Anonimização de dados (LGPD) ----
  const [lgpdIdentificador, setLgpdIdentificador] = useState('');
  const [lgpdBusca, setLgpdBusca] = useState<{ encontrado: boolean; tipo?: string; registro?: any } | null>(null);
  const [lgpdBuscando, setLgpdBuscando] = useState(false);
  const [lgpdAnonimizando, setLgpdAnonimizando] = useState(false);
  const [lgpdResultado, setLgpdResultado] = useState<string | null>(null);
  const [lgpdErro, setLgpdErro] = useState<string | null>(null);

  const buscarParaAnonimizar = async () => {
    if (!lgpdIdentificador.trim()) return;
    setLgpdBuscando(true);
    setLgpdErro(null);
    setLgpdResultado(null);
    setLgpdBusca(null);
    try {
      const resp = await api.request<{ encontrado: boolean; tipo?: string; registro?: any }>(
        `/anonimizacao/buscar?identificador=${encodeURIComponent(lgpdIdentificador.trim())}`
      );
      setLgpdBusca(resp);
    } catch (e: any) {
      setLgpdErro(e?.message || 'Erro ao buscar identificador.');
    } finally {
      setLgpdBuscando(false);
    }
  };

  const confirmarAnonimizacao = async () => {
    if (!lgpdBusca?.encontrado || !lgpdBusca.registro?.id) return;
    const rotulo = lgpdBusca.tipo === 'USUARIO' ? lgpdBusca.registro.name : lgpdBusca.registro.nome;
    if (!window.confirm(
      `Anonimizar os dados de "${rotulo}" (LGPD)?\n\nOs dados pessoais serão substituídos por placeholders e o acesso será bloqueado. Histórico e relatórios são preservados. Essa ação não pode ser desfeita.`
    )) return;
    setLgpdAnonimizando(true);
    setLgpdErro(null);
    setLgpdResultado(null);
    try {
      const resp = await api.request<{ message: string }>('/anonimizacao', {
        method: 'POST',
        body: JSON.stringify({ identificador: lgpdIdentificador.trim() }),
      });
      setLgpdResultado(resp.message);
      setLgpdBusca(null);
      setLgpdIdentificador('');
    } catch (e: any) {
      setLgpdErro(e?.message || 'Erro ao anonimizar.');
    } finally {
      setLgpdAnonimizando(false);
    }
  };


  useEffect(() => {
    carregarVagoneteiros(1);
    carregarDados();
  }, []);

  useEffect(() => {
    const handler = () => setModalRelatorio(prev => ({ ...prev, open: true }));
    window.addEventListener('gerarRelatorioGeral', handler);
    return () => window.removeEventListener('gerarRelatorioGeral', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A tabela usa passeiosData paginado; o histórico usa todosPasseios (carregado com limit=100)
  const passeios = passeiosData?.data || [];
  const totalPaginasPasseio = passeiosData?.totalPages || 1;

  async function carregarPasseios(page: number) {
    try {
      const data = await api.request<PasseiosResponse>(`/passeios?page=${page}&limit=5`);
      setPasseiosData(data);
      setPaginaPasseio(page);
    } catch { /* api.request já trata erro */ }
  }

  async function carregarDados() {
    setLoadingData(true);
    try {
      const [p, t, a, av, c] = await Promise.all([
        api.request<PasseiosResponse>("/passeios?page=1&limit=5"),
        api.request<PasseiosResponse>('/passeios?limit=100'),
        api.request<Agendamento[]>("/agendamentos"),
        api.request<Avaliacao[]>("/avaliacoes"),
        api.request<Cliente[]>("/clientes"),
      ]);
      setPasseiosData(p);
      setTodosPasseios(t.data);
      setAgendamentos(a);
      setAvaliacoes(av);
      setClientes(c);

      // Resumo do painel é opcional — não trava o carregamento principal
      api.request<{ totalTuristas: number; passeiosRealizados: number; receitaEstimada: number }>("/painel/resumo")
        .then(r => setResumoPainel(r))
        .catch(() => { });

      // Avaliação em cache
      api.request<{ avaliacaoMedia: number; totalAvaliacoes: number; atualizadaEm: string | null }>("/painel/avaliacao")
        .then(r => setAvaliacaoCache(r))
        .catch(() => { });
    } catch {
      // api.request já trata erro
    }
    setLoadingData(false);
  }

  async function carregarVagoneteiros(page: number, tipo?: 'VAGONETEIRO' | 'ADMIN') {
    setVagLoading(true);
    const t = tipo ?? tipoUsuario;
    try {
      const data = await api.request<VagoneteirosResponse>(`/usuarios/vagoneteiros?page=${page}&limit=${VAG_POR_PAGINA}&perfil=${t}`);
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

  // Estatísticas — usa resumo unificado do backend (sistema de slots)
  const totalTuristas = resumoPainel?.totalTuristas ?? 0;
  const passeiosRealizados = resumoPainel?.passeiosRealizados ?? 0;
  const receitaEstimada = resumoPainel?.receitaEstimada ?? 0;
  const notaCache = avaliacaoCache?.avaliacaoMedia ?? 0;
  const avaliacaoMedia = notaCache > 0 ? notaCache.toFixed(1) : "0.0";
  const dataAvaliacao = avaliacaoCache?.atualizadaEm
    ? new Date(avaliacaoCache.atualizadaEm).toLocaleDateString('pt-BR')
    : null;

  const statCards = [
    { label: "Total de Turistas", value: totalTuristas.toLocaleString("pt-BR"), icon: Users, color: "text-blue-accent" },
    { label: "Passeios Realizados", value: String(passeiosRealizados), icon: CheckCircle, color: "text-green-timeline" },
    { label: "Receita Estimada", value: formatBRL(receitaEstimada), icon: DollarSign, color: "text-[#b61722]" },
    { label: "Avaliação Média", value: avaliacaoMedia, icon: Star, color: "text-amber-500" },
  ];

  // Histórico de Agenda: exibe TODOS os passeios (incluindo REALIZADOS)
  const grupos = todosPasseios
    .map(p => {
      const registros = filtroStatus === 'TODOS'
        ? agendamentos.filter(a => a.passeio.id === p.id)
        : agendamentos.filter(a => {
          if (a.passeio.id !== p.id) return false;
          if (filtroStatus === 'ANDAMENTO') return a.status === 'CONFIRMADO' || a.status === 'PENDENTE';
          return a.status === filtroStatus;
        });
      return { id_passeio: p.id, passeio: p, registros };
    })
    .filter(g => {
      if (filtroStatus === 'TODOS') return true;
      if (filtroStatus === 'REALIZADO') {
        return (g.passeio as any).status === 'REALIZADO' || g.registros.some(r => r.status === 'REALIZADO');
      }
      return g.registros.length > 0 || (g.passeio as any).status === filtroStatus;
    });
  const totalPaginas = Math.ceil(grupos.length / CARDS_POR_PAGINA);
  const gruposPaginados = grupos.slice((pagina - 1) * CARDS_POR_PAGINA, pagina * CARDS_POR_PAGINA);

  const vagPaginados = vagoneteirosData?.data || [];
  const totalPaginasVag = vagoneteirosData?.totalPages || 1;

  const getClienteNome = (id: number) => clientes.find(c => c.id === id)?.nome || `Cliente #${id}`;

  async function gerarRelatorioGeral(inicio?: string, fim?: string) {
    const { default: jsPDF } = await import('jspdf');

    // Buscar dados frescos do backend para o período
    const [resumo, passeiosList, vagoneteirosList, agendamentosList, avaliacaoResult] = await Promise.all([
      api.request<{ totalTuristas: number; passeiosRealizados: number; receitaEstimada: number }>(
        inicio && fim ? `/painel/resumo?inicio=${inicio}&fim=${fim}` : '/painel/resumo'
      ),
      api.request<any>(inicio && fim ? `/passeios?limit=200&inicio=${inicio}&fim=${fim}` : '/passeios?limit=200'),
      api.request<any>('/usuarios/vagoneteiros?limit=200'),
      api.request<any[]>(
        inicio && fim ? `/agendamentos?inicio=${inicio}&fim=${fim}` : '/agendamentos'
      ),
      api.request<{ avaliacaoMedia: number }>('/painel/avaliacao'),
    ]);

    const totalTuristasRel = resumo?.totalTuristas ?? 0;
    const passeiosRealizadosRel = resumo?.passeiosRealizados ?? 0;
    const receitaEstimadaRel = resumo?.receitaEstimada ?? 0;
    const avaliacaoMediaRel = (avaliacaoResult?.avaliacaoMedia ?? 0).toFixed(1);
    const todosPasseiosRel = passeiosList?.data ?? [];
    const allVagRel = vagoneteirosList?.data ?? [];
    const agendamentosRel = agendamentosList ?? [];

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 14;
    const colRight = pw - margin;
    let y = margin;

    const addPageIfNeeded = (needed = 10) => {
      if (y + needed > ph - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const periodoLabel = inicio && fim
      ? `${new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR')} — ${new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR')}`
      : 'Geral (todo período)';

    // Cabeçalho do PDF
    doc.setFillColor(15, 23, 43);
    doc.rect(0, 0, pw, 22, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Relatório — Vagoneteiros dos Molhes da Barra', margin, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${hoje}`, colRight, 14, { align: 'right' });
    y = 25;
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text(periodoLabel, margin, y);
    y = 32;

    // Estatísticas
    doc.setTextColor(24, 28, 33);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Estatísticas Gerais', margin, y);
    y += 6;
    doc.setDrawColor(230, 232, 240);
    doc.line(margin, y, colRight, y);
    y += 5;

    const stats = [
      ['Total de Turistas', String(totalTuristasRel)],
      ['Passeios Realizados', String(passeiosRealizadosRel)],
      ['Receita Estimada', formatBRL(receitaEstimadaRel)],
      ['Avaliação Média', `${avaliacaoMediaRel} / 5`],
    ];
    doc.setFontSize(9);
    const colW = (pw - margin * 2) / 2;
    stats.forEach(([label, val], i) => {
      const x = margin + (i % 2) * colW;
      if (i % 2 === 0 && i > 0) y += 12;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(label, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 28, 33);
      doc.text(val, x, y + 5);
    });
    y += 18;

    // Tabela de Passeios
    addPageIfNeeded(20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 28, 33);
    doc.text('Passeios Cadastrados', margin, y);
    y += 6;
    doc.line(margin, y, colRight, y);
    y += 5;

    const pHeaders = ['Data', 'Horário', 'Valor (R$)', 'Capacidade', 'Vagoneteiro'];
    const pCols = [40, 22, 28, 26, 0];
    const pTotalFixed = pCols.slice(0, -1).reduce((a, b) => a + b, 0);
    pCols[pCols.length - 1] = colRight - margin - pTotalFixed;

    doc.setFillColor(242, 243, 251);
    doc.rect(margin, y, colRight - margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    let x = margin + 2;
    pHeaders.forEach((h, i) => { doc.text(h, x, y + 5); x += pCols[i]; });
    y += 8;

    doc.setFont('helvetica', 'normal');
    todosPasseiosRel.forEach((p: any, idx: number) => {
      addPageIfNeeded(8);
      if (idx % 2 === 0) { doc.setFillColor(248, 249, 255); doc.rect(margin, y, colRight - margin, 7, 'F'); }
      doc.setTextColor(24, 28, 33);
      x = margin + 2;
      const row = [
        formatData(p.data),
        p.horario,
        Number(p.preco).toFixed(2),
        String(p.capacidade),
        p.usuario?.name || '—',
      ];
      row.forEach((v, i) => { doc.text(String(v), x, y + 5); x += pCols[i]; });
      y += 7;
    });
    y += 6;

    // Tabela de Vagoneteiros
    addPageIfNeeded(20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 28, 33);
    doc.text('Vagoneteiros', margin, y);
    y += 6;
    doc.line(margin, y, colRight, y);
    y += 5;

    const vHeaders = ['Nome', 'CPF', 'Telefone', 'Status'];
    const vCols = [60, 35, 35, 0];
    const vTotalFixed = vCols.slice(0, -1).reduce((a, b) => a + b, 0);
    vCols[vCols.length - 1] = colRight - margin - vTotalFixed;

    doc.setFillColor(242, 243, 251);
    doc.rect(margin, y, colRight - margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    x = margin + 2;
    vHeaders.forEach((h, i) => { doc.text(h, x, y + 5); x += vCols[i]; });
    y += 8;

    doc.setFont('helvetica', 'normal');
    allVagRel.forEach((v: any, idx: number) => {
      addPageIfNeeded(8);
      if (idx % 2 === 0) { doc.setFillColor(248, 249, 255); doc.rect(margin, y, colRight - margin, 7, 'F'); }
      doc.setTextColor(24, 28, 33);
      x = margin + 2;
      [v.name, v.cpf || '—', v.telefone || '—', v.ativo ? 'Ativo' : 'Inativo'].forEach((val, i) => {
        doc.text(String(val), x, y + 5);
        x += vCols[i];
      });
      y += 7;
    });
    y += 6;

    // Tabela de Agendamentos
    addPageIfNeeded(20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 28, 33);
    doc.text('Histórico de Agendamentos', margin, y);
    y += 6;
    doc.line(margin, y, colRight, y);
    y += 5;

    const aHeaders = ['Passeio', 'Data', 'Horário', 'Cliente', 'Acomp.', 'Status'];
    const aCols = [16, 28, 20, 48, 16, 0];
    const aTotalFixed = aCols.slice(0, -1).reduce((a, b) => a + b, 0);
    aCols[aCols.length - 1] = colRight - margin - aTotalFixed;

    doc.setFillColor(242, 243, 251);
    doc.rect(margin, y, colRight - margin, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    x = margin + 2;
    aHeaders.forEach((h, i) => { doc.text(h, x, y + 5); x += aCols[i]; });
    y += 8;

    doc.setFont('helvetica', 'normal');
    agendamentosRel.forEach((a: any, idx: number) => {
      addPageIfNeeded(8);
      if (idx % 2 === 0) { doc.setFillColor(248, 249, 255); doc.rect(margin, y, colRight - margin, 7, 'F'); }
      doc.setTextColor(24, 28, 33);
      x = margin + 2;
      [
        `#${a.passeio.id}`,
        formatData(a.passeio.data),
        a.passeio.horario,
        a.cliente?.nome || `#${a.cliente?.id}`,
        String(a.acompanhantes || 0),
        statusConfig[a.status]?.label || a.status,
      ].forEach((val, i) => { doc.text(String(val), x, y + 5); x += aCols[i]; });
      y += 7;
    });

    // rodapé
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let pg = 1; pg <= totalPages; pg++) {
      doc.setPage(pg);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      doc.text(`Página ${pg} de ${totalPages}`, pw / 2, ph - 6, { align: 'center' });
    }

    const suffix = inicio && fim ? `${inicio}_a_${fim}` : 'geral';
    doc.save(`relatorio_${suffix}.pdf`);
  }

  // Exporta o relatório geral em CSV (mesmos dados/seções do PDF)
  async function gerarRelatorioCSV(inicio?: string, fim?: string) {
    const [resumo, passeiosList, vagoneteirosList, agendamentosList, avaliacaoResult] = await Promise.all([
      api.request<{ totalTuristas: number; passeiosRealizados: number; receitaEstimada: number }>(
        inicio && fim ? `/painel/resumo?inicio=${inicio}&fim=${fim}` : '/painel/resumo'
      ),
      api.request<any>(inicio && fim ? `/passeios?limit=200&inicio=${inicio}&fim=${fim}` : '/passeios?limit=200'),
      api.request<any>('/usuarios/vagoneteiros?limit=200'),
      api.request<any[]>(
        inicio && fim ? `/agendamentos?inicio=${inicio}&fim=${fim}` : '/agendamentos'
      ),
      api.request<{ avaliacaoMedia: number }>('/painel/avaliacao'),
    ]);

    const totalTuristasRel = resumo?.totalTuristas ?? 0;
    const passeiosRealizadosRel = resumo?.passeiosRealizados ?? 0;
    const receitaEstimadaRel = resumo?.receitaEstimada ?? 0;
    const avaliacaoMediaRel = (avaliacaoResult?.avaliacaoMedia ?? 0).toFixed(1);
    const todosPasseiosRel = passeiosList?.data ?? [];
    const allVagRel = vagoneteirosList?.data ?? [];
    const agendamentosRel = agendamentosList ?? [];

    const linhas: unknown[][] = [];

    // Estatísticas Gerais
    linhas.push(['RELATÓRIO — VAGONETEIROS DOS MOLHES DA BARRA']);
    linhas.push(['Período', inicio && fim ? `${inicio} a ${fim}` : 'Geral (todo período)']);
    linhas.push(['Gerado em', new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })]);
    linhas.push([]);
    linhas.push(['ESTATÍSTICAS GERAIS', '']);
    linhas.push(['Total de Turistas', totalTuristasRel]);
    linhas.push(['Passeios Realizados', passeiosRealizadosRel]);
    linhas.push(['Receita Estimada', formatBRL(receitaEstimadaRel)]);
    linhas.push(['Avaliação Média', `${avaliacaoMediaRel} / 5`]);
    linhas.push([]);

    // Passeios Cadastrados
    linhas.push(['PASSEIOS CADASTRADOS', '', '', '', '']);
    linhas.push(['Data', 'Horário', 'Valor (R$)', 'Capacidade', 'Vagoneteiro']);
    todosPasseiosRel.forEach((p: any) => {
      linhas.push([
        formatData(p.data),
        p.horario,
        Number(p.preco).toFixed(2),
        p.capacidade,
        p.usuario?.name || '—',
      ]);
    });
    linhas.push([]);

    // Vagoneteiros
    linhas.push(['VAGONETEIROS', '', '', '']);
    linhas.push(['Nome', 'CPF', 'Telefone', 'Status']);
    allVagRel.forEach((v: any) => {
      linhas.push([v.name, v.cpf || '—', v.telefone || '—', v.ativo ? 'Ativo' : 'Inativo']);
    });
    linhas.push([]);

    // Histórico de Agendamentos
    linhas.push(['HISTÓRICO DE AGENDAMENTOS', '', '', '', '', '']);
    linhas.push(['Passeio', 'Data', 'Horário', 'Cliente', 'Acomp.', 'Status']);
    agendamentosRel.forEach((a: any) => {
      linhas.push([
        `#${a.passeio?.id}`,
        formatData(a.passeio?.data),
        a.passeio?.horario,
        a.cliente?.nome || `#${a.cliente?.id}`,
        a.acompanhantes || 0,
        statusConfig[a.status]?.label || a.status,
      ]);
    });

    const suffix = inicio && fim ? `${inicio}_a_${fim}` : 'geral';
    exportarCSV(`relatorio_${suffix}.csv`, linhas);
  }

  return (
    <div className="min-h-screen bg-bg-light-1 flex flex-col">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-10 flex flex-col gap-8">

        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
            <Users className="size-4" strokeWidth={2} />
          </div>
          <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
            Painel Administrativo
          </h1>
        </div>

        <AdminQuickActions />

        {/* Dashboard / Métricas */}
        <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="text-blue-accent" size={22} strokeWidth={1.8} />
            <h2 className="font-bold text-lg text-text-dark">Dashboard</h2>
          </div>
          <DashboardProvider />
        </div>

        {/* Gestão de Passeios e Agendamentos */}
        <div className="flex items-center gap-3 flex-wrap">
          <Ticket className="text-text-dark" size={22} strokeWidth={1.8} />
          <h2 className="font-bold text-lg text-text-dark">Gestão de Passeios e Agendamentos</h2>
          <div className="flex-1" />
          <button
            onClick={() => setModalCancelamentoMassa(m => ({ ...m, open: true, resultado: null, erro: null }))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer"
          >
            <CalendarX2 size={16} /> Cancelamento em massa
          </button>
        </div>

        {/* Stat Cards */}
        {loadingData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-border animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-7 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, icon: Icon, color }) => {
              const isAvaliacao = label === 'Avaliação Média';
              return (
                <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-border flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-text-secondary tracking-widest uppercase">{label}</p>
                    <Icon size={16} className={`${color} opacity-60`} />
                  </div>
                  <p className={`font-bold text-2xl md:text-3xl tracking-tight ${color}`}>{value}</p>
                  {isAvaliacao && (
                    <>
                      {dataAvaliacao && (
                        <span className="text-[10px] text-text-secondary -mt-1">Atualizada em {dataAvaliacao}</span>
                      )}
                      <button
                        onClick={() => {
                          setEditNota(String(avaliacaoCache?.avaliacaoMedia ?? ''));
                          setEditTotal(String(avaliacaoCache?.totalAvaliacoes ?? ''));
                          setModalAvaliacao(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-accent hover:text-blue-dark transition-colors cursor-pointer -mt-0.5"
                      >
                        <RefreshCw size={12} /> Atualizar
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Gestão de Passeios */}
        <PasseiosTable
          passeiosData={passeiosData}
          loadingData={loadingData}
          paginaPasseio={paginaPasseio}
          totalPaginasPasseio={totalPaginasPasseio}
          carregarPasseios={carregarPasseios}
          onEdit={(id) => navigate(`/editar-passeio/${id}`)}
          onDelete={async (id) => {
            if (!confirm(`Tem certeza que deseja cancelar o passeio #${id}?`)) return;
            try {
              await api.request(`/passeios/${id}`, { method: 'DELETE' });
              await carregarPasseios(paginaPasseio);
            } catch { }
          }}
        />

        {/* Suspensão de Atividades */}
        <section className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <PauseCircle className="text-amber-600" size={20} strokeWidth={1.8} />
              <h2 className="font-bold text-base text-text-dark">Suspensão de Atividades</h2>
              <select
                value={filtroSuspensao}
                onChange={e => setFiltroSuspensao(e.target.value as any)}
                className="ml-1 text-xs font-medium rounded-lg border border-border px-2 py-1.5 bg-white text-text-dark focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
                title="Filtrar suspensões"
              >
                <option value="ativas">Somente ativas</option>
                <option value="todas">Todas</option>
                <option value="removidas">Somente removidas</option>
              </select>
            </div>
            <button
              onClick={() => setModalSuspensao(m => ({ ...m, open: true, erro: null, resultado: null }))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
            >
              <Ban size={16} /> Suspender período
            </button>
          </div>

          <div className="px-6 py-4">
            {(() => {
              const filtradas = suspensoes.filter(s =>
                filtroSuspensao === 'ativas' ? s.ativa :
                filtroSuspensao === 'removidas' ? !s.ativa : true
              );
              return filtradas.length === 0 ? (
                <p className="text-sm text-text-secondary">Nenhum período de suspensão registrado.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {filtradas.map(s => (
                  <li key={s.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${s.ativa ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-text-secondary'}`}>
                        {s.ativa ? <PauseCircle size={12} /> : <PlayCircle size={12} />}
                        {s.ativa ? 'Ativa' : 'Removida'}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-dark">
                          {formatarDataSuspensao(s.dataInicio)} — {formatarDataSuspensao(s.dataFim)}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {s.motivo || 'Sem motivo informado'}
                        </p>
                      </div>
                    </div>
                    {s.ativa && (
                      <button
                        onClick={() => removerSuspensao(s.id)}
                        disabled={removendoSuspensaoId === s.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {removendoSuspensaoId === s.id ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                        Remover suspensão
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              );
            })()}
          </div>
        </section>

        {/* Anonimização de dados (LGPD) */}
        <section className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-red-600" size={20} strokeWidth={1.8} />
              <h2 className="font-bold text-base text-text-dark">Exclusão de dados (LGPD)</h2>
            </div>
            <span className="text-xs text-text-secondary">por e-mail do titular</span>
          </div>

          <div className="px-6 py-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={lgpdIdentificador}
                onChange={e => { setLgpdIdentificador(e.target.value); setLgpdBusca(null); setLgpdResultado(null); setLgpdErro(null); }}
                placeholder="CPF ou e-mail do titular"
                className="flex-1 text-sm rounded-lg border border-border px-3 py-2 text-text-dark focus:outline-none focus:ring-2 focus:ring-red-500/50"
                onKeyDown={e => { if (e.key === 'Enter') buscarParaAnonimizar(); }}
              />
              <button
                onClick={buscarParaAnonimizar}
                disabled={lgpdBuscando || !lgpdIdentificador.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-dark hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {lgpdBuscando ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
              </button>
            </div>

            {lgpdErro && <p className="text-sm text-red-600">{lgpdErro}</p>}
            {lgpdResultado && <p className="text-sm text-green-600">{lgpdResultado}</p>}

            {lgpdBusca && (
              <div className="rounded-lg border border-border bg-bg-light-1 p-4 flex flex-col gap-3">
                {lgpdBusca.encontrado ? (
                  <>
                    <div className="flex items-center gap-3">
                      <UserX size={18} className="text-red-600" />
                      <div>
                        <p className="text-sm font-semibold text-text-dark">
                          {lgpdBusca.tipo === 'USUARIO' ? lgpdBusca.registro.name : lgpdBusca.registro.nome}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {lgpdBusca.tipo === 'USUARIO' ? 'Usuário' : 'Cliente'} · id {lgpdBusca.registro.id}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={confirmarAnonimizacao}
                      disabled={lgpdAnonimizando}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {lgpdAnonimizando ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />} Anonimizar dados
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-text-secondary">Nenhum usuário ou cliente encontrado para esse CPF/e-mail.</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Vagoneteiros + Histórico */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">

          <AdminVagoneteiros
            vagoneteirosData={vagoneteirosData}
            carregarVagoneteiros={carregarVagoneteiros}
            paginaVag={paginaVag}
            vagLoading={vagLoading}
            toggleAtivo={toggleAtivo}
            togglingId={togglingId}
            tipoUsuario={tipoUsuario}
            setTipoUsuario={setTipoUsuario}
          />
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
                  <option value="REALIZADO">Realizado</option>
                  <option value="CONFIRMADO">Confirmado</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="CANCELADO">Cancelado</option>
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
                  .reduce((sum, r) => sum + 1 + (r.acompanhantes || 0), 0);

                return (
                  <div key={id_passeio} className="px-6 py-4">
                    {/* Cabeçalho do passeio */}
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border/50">
                      <Ticket size={16} className="text-blue-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-text-dark">Passeio #{id_passeio}</p>
                          {(passeio as any)?.status === 'REALIZADO' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-timeline/10 text-green-timeline border border-green-timeline/25">
                              Realizado
                            </span>
                          )}
                        </div>
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
                        const numAcomp = a.acompanhantes || 0;
                        const totalVagas = 1 + numAcomp;
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-3 text-sm py-1.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                              <span className="truncate text-text-primary">
                                {a.cliente?.nome || `Cliente #${a.cliente?.id || "?"}`}
                              </span>
                              <span className="text-xs font-bold text-green-timeline ml-1 shrink-0">
                                {formatBRL(Number(passeio?.preco || 0) * totalVagas)}
                              </span>
                            </div>
                            <span className="text-xs text-[#7a8394] shrink-0">
                              {numAcomp > 0 ? `1 + ${numAcomp} acompanhante${numAcomp > 1 ? 's' : ''}` : `${totalVagas} vaga${totalVagas > 1 ? 's' : ''}`}
                            </span>
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
                  {renderPaginacao(pagina, totalPaginas, (n) => setPagina(n))}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Modal de filtro do relatório */}
      {modalRelatorio.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModalRelatorio({ ...modalRelatorio, open: false })}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-text-dark mb-4">Exportar Relatório</h3>
            <p className="text-sm text-text-secondary mb-4">Selecione o período do relatório:</p>
            <div className="flex flex-col gap-2">
              {[
                { 
                  label: <><Calendar className="size-4" /> Hoje</>, 
                  preset: 'hoje', 
                  get: () => { const d = new Date(); return { inicio: d.toISOString().slice(0, 10), fim: d.toISOString().slice(0, 10) }; } 
                },
                {
                  label: <><CalendarDays className="size-4" /> Esta Semana</>, 
                  preset: 'semana', 
                  get: () => {
                    const hoje = new Date();
                    const diaSemana = hoje.getDay();
                    const diffSeg = hoje.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
                    const seg = new Date(hoje.getFullYear(), hoje.getMonth(), diffSeg);
                    const dom = new Date(seg);
                    dom.setDate(seg.getDate() + 6);
                    return { inicio: seg.toISOString().slice(0, 10), fim: dom.toISOString().slice(0, 10) };
                  }
                },
                {
                  label: <><LineChart className="size-4" /> Este Mês</>, 
                  preset: 'mensal', 
                  get: () => {
                    const d = new Date();
                    const inicio = new Date(d.getFullYear(), d.getMonth(), 1);
                    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                    return { inicio: inicio.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) };
                  }
                },
                {
                  label: <><SlidersHorizontal className="size-4" /> Personalizado</>, 
                  preset: 'custom', 
                  get: () => ({ inicio: modalRelatorio.inicio, fim: modalRelatorio.fim }),
                  onClick: () => setModalRelatorio(m => ({ ...m, preset: 'custom' })),
                },
              ].map(({ label, preset, get, onClick }) => (
                <div key={preset} className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      if (onClick) { onClick(); return; }
                      const { inicio, fim } = get();
                      setModalRelatorio({ ...modalRelatorio, open: false });
                      await gerarRelatorioGeral(inicio, fim);
                    }}
                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-bg-light-1 text-sm font-semibold text-text-primary transition-colors cursor-pointer text-left"
                  >
                    {label}
                    <span className="ml-auto text-[10px] font-bold text-[#7a8392] uppercase">PDF</span>
                  </button>
                  <button
                    onClick={async () => {
                      if (onClick) { onClick(); return; }
                      const { inicio, fim } = get();
                      setModalRelatorio({ ...modalRelatorio, open: false });
                      await gerarRelatorioCSV(inicio, fim);
                    }}
                    className="flex-1 flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-blue-accent/25 bg-blue-accent/5 hover:bg-blue-accent/10 text-sm font-semibold text-blue-accent transition-colors cursor-pointer text-left"
                  >
                    {label}
                    <span className="ml-auto text-[10px] font-bold uppercase">CSV</span>
                  </button>
                </div>
              ))}
            </div>
            {modalRelatorio.preset === 'custom' && (
              <div className="flex flex-col gap-2 mt-3">
                <input type="date" value={modalRelatorio.inicio} onChange={e => setModalRelatorio({ ...modalRelatorio, inicio: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg text-sm" />
                <input type="date" value={modalRelatorio.fim} onChange={e => setModalRelatorio({ ...modalRelatorio, fim: e.target.value })}
                  className="px-3 py-2 border border-border rounded-lg text-sm" />
                <button
                  onClick={async () => {
                    if (!modalRelatorio.inicio || !modalRelatorio.fim) return;
                    const { inicio, fim } = { inicio: modalRelatorio.inicio, fim: modalRelatorio.fim };
                    setModalRelatorio({ ...modalRelatorio, open: false });
                    await gerarRelatorioGeral(inicio, fim);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-accent text-white text-sm font-semibold hover:bg-blue-dark mt-1 transition-colors cursor-pointer"
                >
                  Gerar PDF
                </button>
                <button
                  onClick={async () => {
                    if (!modalRelatorio.inicio || !modalRelatorio.fim) return;
                    const { inicio, fim } = { inicio: modalRelatorio.inicio, fim: modalRelatorio.fim };
                    setModalRelatorio({ ...modalRelatorio, open: false });
                    await gerarRelatorioCSV(inicio, fim);
                  }}
                  className="px-4 py-2 rounded-lg border border-blue-accent/25 bg-blue-accent/5 text-blue-accent text-sm font-semibold hover:bg-blue-accent/10 mt-1 transition-colors cursor-pointer"
                >
                  Gerar CSV
                </button>
              </div>
            )}
            <button
              onClick={() => setModalRelatorio({ ...modalRelatorio, open: false })}
              className="w-full mt-3 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-bg-light-1 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de atualizar avaliação */}
      {modalAvaliacao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setModalAvaliacao(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-text-dark mb-4">Atualizar Avaliação</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Nota média</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={editNota}
                  onChange={e => setEditNota(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                  placeholder="Ex: 4.6"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Total de avaliações</label>
                <input
                  type="number"
                  min="0"
                  value={editTotal}
                  onChange={e => setEditTotal(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                  placeholder="Ex: 123"
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setModalAvaliacao(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-bg-light-1 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  disabled={salvandoAvaliacao || !editNota}
                  onClick={async () => {
                    setSalvandoAvaliacao(true);
                    try {
                      const r = await api.request<{ avaliacaoMedia: number; totalAvaliacoes: number; atualizadaEm: string }>('/painel/avaliacao/atualizar', {
                        method: 'POST',
                        body: JSON.stringify({
                          avaliacaoMedia: Number(editNota.replace(',', '.')),
                          totalAvaliacoes: Number(editTotal) || 0,
                        }),
                      });
                      setAvaliacaoCache(r);
                      setModalAvaliacao(false);
                    } catch { }
                    setSalvandoAvaliacao(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-blue-accent text-white text-sm font-semibold hover:bg-blue-dark transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {salvandoAvaliacao ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cancelamento em Massa */}
      {modalCancelamentoMassa.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !modalCancelamentoMassa.carregando && setModalCancelamentoMassa(m => ({ ...m, open: false }))}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-text-dark">Cancelamento em massa</h3>
              <button
                onClick={() => setModalCancelamentoMassa(m => ({ ...m, open: false }))}
                className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                disabled={modalCancelamentoMassa.carregando}
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Cancela todos os agendamentos de passeios ainda não realizados dentro do período selecionado.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Data início</label>
                <input
                  type="date"
                  min={dataMinimaHoje}
                  value={modalCancelamentoMassa.inicio}
                  onChange={e => setModalCancelamentoMassa(m => ({ ...m, inicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Data fim</label>
                <input
                  type="date"
                  min={dataMinimaHoje}
                  value={modalCancelamentoMassa.fim}
                  onChange={e => setModalCancelamentoMassa(m => ({ ...m, fim: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Motivo (opcional)</label>
                <textarea
                  value={modalCancelamentoMassa.motivo}
                  onChange={e => setModalCancelamentoMassa(m => ({ ...m, motivo: e.target.value }))}
                  rows={2}
                  placeholder="Ex: Condição climática adversa"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30 resize-none"
                />
              </div>
            </div>

            {modalCancelamentoMassa.resultado && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
                {modalCancelamentoMassa.resultado}
              </div>
            )}
            {modalCancelamentoMassa.erro && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
                {modalCancelamentoMassa.erro}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setModalCancelamentoMassa(m => ({ ...m, open: false }))}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-bg-light-1 transition-colors cursor-pointer"
                disabled={modalCancelamentoMassa.carregando}
              >
                Fechar
              </button>
              <button
                disabled={modalCancelamentoMassa.carregando || !modalCancelamentoMassa.inicio || !modalCancelamentoMassa.fim}
                onClick={() => {
                  if (!confirm(`Confirmar o cancelamento em massa de todos os agendamentos entre ${modalCancelamentoMassa.inicio} e ${modalCancelamentoMassa.fim}?`)) return;
                  cancelarEmMassa();
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {modalCancelamentoMassa.carregando ? (
                  <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cancelando...</span>
                ) : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Suspensão de Atividades */}
      {modalSuspensao.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => !modalSuspensao.carregando && setModalSuspensao(m => ({ ...m, open: false }))}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-text-dark">Suspender período</h3>
              <button
                onClick={() => setModalSuspensao(m => ({ ...m, open: false }))}
                className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                disabled={modalSuspensao.carregando}
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Suspende os passeios e slots do período. Os agendamentos existentes ficam suspensos (status original preservado) e os slots não aparecem para agendamento.
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Data início</label>
                <input
                  type="date"
                  min={dataMinimaHoje}
                  value={modalSuspensao.inicio}
                  onChange={e => setModalSuspensao(m => ({ ...m, inicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Data fim</label>
                <input
                  type="date"
                  min={dataMinimaHoje}
                  value={modalSuspensao.fim}
                  onChange={e => setModalSuspensao(m => ({ ...m, fim: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1 block">Motivo (opcional)</label>
                <textarea
                  value={modalSuspensao.motivo}
                  onChange={e => setModalSuspensao(m => ({ ...m, motivo: e.target.value }))}
                  rows={2}
                  placeholder="Ex: Manutenção no trajeto"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30 resize-none"
                />
              </div>
            </div>

            {modalSuspensao.resultado && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
                {modalSuspensao.resultado}
              </div>
            )}
            {modalSuspensao.erro && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
                {modalSuspensao.erro}
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setModalSuspensao(m => ({ ...m, open: false }))}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-semibold text-text-primary hover:bg-bg-light-1 transition-colors cursor-pointer"
                disabled={modalSuspensao.carregando}
              >
                Fechar
              </button>
              <button
                disabled={modalSuspensao.carregando || !modalSuspensao.inicio || !modalSuspensao.fim}
                onClick={() => {
                  if (!confirm(`Suspender todas as atividades entre ${modalSuspensao.inicio} e ${modalSuspensao.fim}?`)) return;
                  criarSuspensao();
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {modalSuspensao.carregando ? (
                  <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Suspendendo...</span>
                ) : 'Suspender período'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
