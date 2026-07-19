import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

// ─── TIPOS ─────────────────────────────────────────────────────────

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

// ─── COMPONENTE ────────────────────────────────────────────────────

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

  // ─── CARREGAR ATRIBUIÇÕES ────────────────────────────────────────

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

  // ─── CANCELAR ATRIBUIÇÃO ─────────────────────────────────────────

  const cancelar = async (id: number) => {
    setAcaoId(id);
    setMensagem(null);
    try {
      await api.request(`/atribuicoes/${id}/cancelar`, { method: 'PATCH' });
      setMensagem({ tipo: 'sucesso', texto: 'Atribuição cancelada' });
      carregar();
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao cancelar' });
    } finally {
      setAcaoId(null);
    }
  };

  // ─── REALIZAR ATRIBUIÇÃO ─────────────────────────────────────────

  const realizar = async (id: number) => {
    setAcaoId(id);
    setMensagem(null);
    try {
      await api.request(`/atribuicoes/${id}/realizar`, { method: 'PATCH' });
      setMensagem({ tipo: 'sucesso', texto: '✅ Passeio marcado como realizado!' });
      carregar();
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao realizar' });
    } finally {
      setAcaoId(null);
    }
  };

  // ─── HELPERS ─────────────────────────────────────────────────────

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
        return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Atribuído</span>;
      case 'REALIZADO':
        return <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">✅ Realizado</span>;
      case 'CANCELADO':
        return <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">Cancelado</span>;
      default:
        return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Minhas Atribuições</h2>
            <p className="text-gray-500">Faça login para ver suas atribuições.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-800">📋 Minhas Atribuições</h1>
              {total > 0 && (
                <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                  {total}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              <button
                onClick={() => navigate('/feed-vagoneteiro')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                ← Voltar ao feed
              </button>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <button
              onClick={logout}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Mensagem */}
        {mensagem && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        {/* Filtro */}
        <div className="mb-6 flex gap-3">
          {['', 'ATRIBUIDO', 'REALIZADO', 'CANCELADO'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFiltro(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFiltro === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s || 'Todos'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🚂</div>
            <p className="text-gray-500">Carregando...</p>
          </div>
        )}

        {/* Lista vazia */}
        {!loading && atribuicoes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma atribuição</h3>
            <p className="text-gray-500 mb-4">
              {statusFiltro ? 'Nenhuma atribuição com este status.' : 'Você ainda não pegou nenhum passeio!'}
            </p>
            <button
              onClick={() => navigate('/feed-vagoneteiro')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              🚂 Ver passeios disponíveis
            </button>
          </div>
        )}

        {/* Lista */}
        {!loading && atribuicoes.map((attr) => (
          <div
            key={attr.id}
            className={`bg-white rounded-xl shadow-sm border mb-3 p-4 ${
              attr.status === 'CANCELADO' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{attr.slotPasseio.titulo}</h3>
                  {statusBadge(attr.status)}
                </div>
                <p className="text-sm text-gray-600">
                  📅 {formatarData(attr.instancia.data)}
                </p>
                <p className="text-sm text-gray-500">
                  🕐 {attr.instancia.horaInicio} - {attr.instancia.horaFim}
                </p>
                <p className="text-xs text-gray-400">
                  Atribuído em: {new Date(attr.atribuidoEm).toLocaleString('pt-BR')}
                </p>
                {attr.canceladoEm && (
                  <p className="text-xs text-red-400">
                    Cancelado em: {new Date(attr.canceladoEm).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Ações */}
              <div className="ml-4 flex flex-col gap-2">
                {attr.status === 'ATRIBUIDO' && (
                  <>
                    <button
                      onClick={() => realizar(attr.id)}
                      disabled={acaoId === attr.id}
                      className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {acaoId === attr.id ? '...' : '✅ Realizar'}
                    </button>
                    <button
                      onClick={() => cancelar(attr.id)}
                      disabled={acaoId === attr.id}
                      className="px-4 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
                    >
                      {acaoId === attr.id ? '...' : 'Cancelar'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-white border rounded-lg text-sm disabled:opacity-40"
            >
              ← Anterior
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-white border rounded-lg text-sm disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinhasAtribuicoes;
