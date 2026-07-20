import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

// ─── TIPOS ─────────────────────────────────────────────────────────

interface SlotInfo {
  id: number;
  titulo: string;
  descricao: string | null;
  horario: string;
  duracao: number;
  valor: string;
  vagoneteiro: { id: number; name: string } | null;
}

interface VagasInfo {
  total: number;
  ocupadas: number;
  disponiveis: number;
}

interface FeedItem {
  instanciaId: number;
  data: string;
  diaSemana: string | null;
  slot: SlotInfo;
  vagas: VagasInfo;
  jaPeguei: boolean;
  podePegar: boolean;
}

interface FeedResponse {
  total: number;
  dias: number;
  data: Record<string, FeedItem[]>;
  flat: FeedItem[];
}

// ─── COMPONENTE ────────────────────────────────────────────────────

export const FeedVagoneteiro: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<Record<string, FeedItem[]>>({});
  const [flat, setFlat] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [atribuindo, setAtribuindo] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [filtro, setFiltro] = useState<string>('');

  // ─── CARREGAR FEED ───────────────────────────────────────────────

  const carregarFeed = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = filtro
        ? `/atribuicoes/feed?data=${filtro}`
        : '/atribuicoes/feed';
      const data = await api.request<FeedResponse>(endpoint);
      setFeed(data.data);
      setFlat(data.flat);
    } catch (error: any) {
      console.error('Erro ao carregar feed:', error);
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao carregar passeios' });
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    carregarFeed();
  }, [carregarFeed]);

  // ─── AUTO-ATRIBUIR ───────────────────────────────────────────────

  const pegarPasseio = async (instanciaId: number) => {
    if (!isAuthenticated) {
      setMensagem({ tipo: 'erro', texto: 'Faça login como vagoneteiro para pegar um passeio!' });
      return;
    }

    setAtribuindo(instanciaId);
    setMensagem(null);

    try {
      await api.request('/atribuicoes/auto-atribuir', {
        method: 'POST',
        body: JSON.stringify({ instanciaId }),
      });

      setMensagem({ tipo: 'sucesso', texto: '🚂 Passeio pego com sucesso!' });
      carregarFeed(); // recarregar
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao pegar passeio' });
    } finally {
      setAtribuindo(null);
    }
  };

  // ─── DIA DA SEMANA PT-BR ─────────────────────────────────────────

  const diasSemana = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  const diasSemanaPt = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const formatarData = (dataStr: string): string => {
    const d = new Date(dataStr + 'T12:00:00');
    const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const diaSemana = diasSemana[d.getDay()];
    const idx = diasSemana.indexOf(diaSemana);
    return `${dia} (${diasSemanaPt[idx] || diaSemana})`;
  };

  const formatarValor = (valor: string): string => {
    const v = parseFloat(valor);
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // ─── RENDER ──────────────────────────────────────────────────────

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="text-6xl mb-4">🚂</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Feed de Passeios</h2>
            <p className="text-gray-600 mb-6">
              Faça login como vagoneteiro para ver os passeios disponíveis e se auto-atribuir!
            </p>
            <p className="text-sm text-gray-400">
              Ainda não é vagoneteiro? Fale com um administrador para se cadastrar.
            </p>
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
            <h1 className="text-2xl font-bold text-gray-800">
              🚂 Feed de Passeios
            </h1>
            <p className="text-sm text-gray-500">
              {flat.length} passeio{flat.length !== 1 ? 's' : ''} disponívei{flat.length !== 1 ? 's' : ''}
              {' · '}
              <button
                onClick={() => navigate('/minhas-atribuicoes')}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Minhas atribuições →
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
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Filtrar por data (mês):
          </label>
          <input
            type="month"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🚂</div>
            <p className="text-gray-500">Carregando passeios...</p>
          </div>
        )}

        {/* Feed por data */}
        {!loading && Object.keys(feed).length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl shadow">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum passeio disponível</h3>
            <p className="text-gray-500">Não há passeios com vagas para este período.</p>
          </div>
        )}

        {!loading && Object.entries(feed).map(([dataKey, items]) => (
          <div key={dataKey} className="mb-8">
            <h2 className="text-lg font-bold text-gray-700 mb-3 border-b pb-2">
              {formatarData(dataKey)}
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.instanciaId}
                  className={`bg-white rounded-xl shadow-sm border ${
                    item.jaPeguei ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:shadow-md'
                  } transition-shadow`}
                >
                  <div className="p-4 flex items-center justify-between">
                    {/* Info do passeio */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{item.slot.titulo}</h3>
                        {item.jaPeguei && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                            ✅ Peguei
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        🕐 {item.slot.horario} · ⏱ {item.slot.duracao}min
                      </p>
                      <p className="text-sm text-gray-500">
                        🎫 {item.vagas.disponiveis}/{item.vagas.total} vagas
                      </p>
                      <p className="text-sm font-medium text-green-700">
                        {formatarValor(item.slot.valor)}
                      </p>
                      {item.slot.descricao && (
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-md">
                          {item.slot.descricao}
                        </p>
                      )}
                    </div>

                    {/* Botão pegar */}
                    <div className="ml-4">
                      {item.jaPeguei ? (
                        <span className="inline-block px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                          ✅ Garantido
                        </span>
                      ) : item.vagas.disponiveis <= 0 ? (
                        <span className="inline-block px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm">
                          Lotado
                        </span>
                      ) : (
                        <button
                          onClick={() => pegarPasseio(item.instanciaId)}
                          disabled={atribuindo === item.instanciaId}
                          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                            atribuindo === item.instanciaId
                              ? 'bg-gray-300 text-gray-500 cursor-wait'
                              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm'
                          }`}
                        >
                          {atribuindo === item.instanciaId ? '🐎 Pegando...' : '🚂 Pegar!'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedVagoneteiro;
