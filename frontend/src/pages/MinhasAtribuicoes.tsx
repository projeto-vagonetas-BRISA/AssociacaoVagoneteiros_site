import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  ClipboardList,
  Clock,
  CalendarDays,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  FileX2,
  Train,
} from 'lucide-react';

// Tipos

interface SlotInfo {
  id: number;
  titulo: string;
  descricao: string | null;
  horaInicio: string;
  horaFim: string;
  capacidade: number;
  valor: string;
}

interface InstanciaInfo {
  id: number;
  data: string;
  horaInicio: string;
  horaFim: string;
}

interface Atribuicao {
  id: number;
  status: 'ATRIBUIDO' | 'REALIZADO' | 'CANCELADO';
  atribuidoEm: string;
  canceladoEm: string | null;
  slotPasseio: SlotInfo;
  instancia: InstanciaInfo;
  vagasOcupadas: number;
}

interface MinhasAtribuicoesResponse {
  data: Atribuicao[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Funções Auxiliares

const SectionIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
    {icon}
  </div>
);

const STATUS_LABELS: Record<string, string> = {
  '': 'Todos',
  ATRIBUIDO: 'Atribuído',
  REALIZADO: 'Realizado',
  CANCELADO: 'Cancelado',
};

// Componente Principal

export const MinhasAtribuicoes: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [acaoId, setAcaoId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Carregar atribuições do backend

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = `/atribuicoes/minhas?page=${page}&limit=20`;
      if (statusFiltro) endpoint += `&status=${statusFiltro}`;

      const data = await api.request<MinhasAtribuicoesResponse>(endpoint);
      setAtribuicoes(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao carregar atribuições' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFiltro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Ação: Cancelar atribuição

  const cancelar = async (id: number) => {
    setAcaoId(id);
    setMensagem(null);
    try {
      await api.request(`/atribuicoes/${id}/cancelar`, { method: 'PATCH' });
      setMensagem({ tipo: 'sucesso', texto: 'Atribuição cancelada.' });
      carregar();
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao cancelar' });
    } finally {
      setAcaoId(null);
    }
  };

  // Ação: Marcar como realizado

  const realizar = async (id: number) => {
    setAcaoId(id);
    setMensagem(null);
    try {
      await api.request(`/atribuicoes/${id}/realizar`, { method: 'PATCH' });
      setMensagem({ tipo: 'sucesso', texto: 'Passeio marcado como realizado.' });
      carregar();
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao realizar' });
    } finally {
      setAcaoId(null);
    }
  };

  // Helpers locais de formatação

  const formatarData = (dataStr: string): string => {
    const d = new Date(dataStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ATRIBUIDO':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-blue/10 text-blue border border-blue/20 px-2 py-0.5 rounded-full font-medium">
            Atribuído
          </span>
        );
      case 'REALIZADO':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-timeline border border-green-timeline/30 px-2 py-0.5 rounded-full font-medium">
            <CheckCircle2 className="size-3" />
            Realizado
          </span>
        );
      case 'CANCELADO':
        return (
          <span className="inline-flex items-center gap-1 text-xs bg-red/10 text-red border border-red/20 px-2 py-0.5 rounded-full font-medium">
            <XCircle className="size-3" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="text-xs bg-bg-light-3 text-text-secondary px-2 py-0.5 rounded-full">
            {status}
          </span>
        );
    }
  };

  // Renderização

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <SectionIcon icon={<ClipboardList className="size-4" strokeWidth={2} />} />
            <h1 className="font-bold text-3xl md:text-4xl text-text-dark tracking-tight">
              Minhas Atribuições
            </h1>
          </div>
        </div>
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-16">
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-accent/10 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="size-8 text-blue-accent" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-text-dark mb-3">Acesso restrito</h2>
            <p className="text-text-secondary">Faça login para ver suas atribuições.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
      {/* Cabeçalho */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/feed-vagoneteiro')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              aria-label="Voltar ao feed"
            >
              <ArrowLeft size={20} className="text-text-dark" />
            </button>
            <SectionIcon icon={<ClipboardList className="size-4" strokeWidth={2} />} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-3xl md:text-4xl text-text-dark tracking-tight">
                  Minhas Atribuições
                </h1>
                {total > 0 && (
                  <span className="text-sm bg-blue/10 text-blue border border-blue/20 px-3 py-1 rounded-full font-semibold">
                    {total}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-accent flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
            <div className="text-right">
              <p className="text-sm font-semibold text-text-dark leading-tight">{user?.name}</p>
              <button
                onClick={logout}
                className="text-xs text-red hover:text-red-dark transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-16 flex flex-col gap-5">
        {/* Mensagem */}
        {mensagem && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium border ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red border-red/20'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* Filtro de status */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-4">
          <div className="flex flex-wrap gap-2">
            {['', 'ATRIBUIDO', 'REALIZADO', 'CANCELADO'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFiltro(s); setPage(1); }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFiltro === s
                    ? 'bg-blue text-white shadow-sm'
                    : 'bg-bg-light-1 text-text-secondary border border-border hover:bg-bg-light-3'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
            <Loader2 className="size-8 animate-spin text-blue-accent" />
            <p className="text-sm">Carregando atribuições...</p>
          </div>
        )}

        {/* Lista vazia */}
        {!loading && atribuicoes.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-border py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-accent/10 flex items-center justify-center">
              <FileX2 className="size-7 text-blue-accent" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-text-dark">Nenhuma atribuição</h3>
            <p className="text-sm text-text-secondary">
              {statusFiltro ? 'Nenhuma atribuição com este status.' : 'Você ainda não pegou nenhum passeio.'}
            </p>
            <button
              onClick={() => navigate('/feed-vagoneteiro')}
              className="mt-2 inline-flex items-center gap-2 bg-blue text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-dark transition-colors"
            >
              <Train className="size-4" />
              Ver passeios disponíveis
            </button>
          </div>
        )}

        {/* Lista de atribuições */}
        {!loading && atribuicoes.map((attr) => (
          <div
            key={attr.id}
            className={`bg-white rounded-xl shadow-sm border border-border p-4 transition-opacity ${
              attr.status === 'CANCELADO' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-text-dark">{attr.slotPasseio.titulo}</h3>
                  {statusBadge(attr.status)}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5 shrink-0" />
                    {formatarData(attr.instancia.data)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5 shrink-0" />
                    {attr.instancia.horaInicio} – {attr.instancia.horaFim}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1.5">
                  Atribuído em: {new Date(attr.atribuidoEm).toLocaleString('pt-BR')}
                </p>
                {attr.canceladoEm && (
                  <p className="text-xs text-red mt-0.5">
                    Cancelado em: {new Date(attr.canceladoEm).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Ações */}
              {attr.status === 'ATRIBUIDO' && (
                <div className="shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => realizar(attr.id)}
                    disabled={acaoId === attr.id}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-alt text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {acaoId === attr.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Realizar
                  </button>
                  <button
                    onClick={() => cancelar(attr.id)}
                    disabled={acaoId === attr.id}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red/10 text-red border border-red/20 rounded-lg text-sm font-semibold hover:bg-red/20 disabled:opacity-50 transition"
                  >
                    <XCircle className="size-4" />
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-1.5 bg-white border border-border rounded-lg text-sm text-text-dark font-medium hover:bg-bg-light-1 disabled:opacity-40 transition"
            >
              Anterior
            </button>
            <span className="text-sm text-text-secondary">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-1.5 bg-white border border-border rounded-lg text-sm text-text-dark font-medium hover:bg-bg-light-1 disabled:opacity-40 transition"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinhasAtribuicoes;
