import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  Train,
  Clock,
  Users,
  CalendarDays,
  SearchX,
  Loader2,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';

// Tipos

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

// Funções Auxiliares

const SectionIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
    {icon}
  </div>
);

// Componente Principal

export const FeedVagoneteiro: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<Record<string, FeedItem[]>>({});
  const [flat, setFlat] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [atribuindo, setAtribuindo] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [filtro, setFiltro] = useState<string>('');

  // Carregar dados do feed

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

  // Atribuir passeio ao vagoneteiro

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

      setMensagem({ tipo: 'sucesso', texto: 'Passeio pego com sucesso!' });
      carregarFeed();
    } catch (error: any) {
      setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao pegar passeio' });
    } finally {
      setAtribuindo(null);
    }
  };

  // Helpers de formatação

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

  // Renderização

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <SectionIcon icon={<Train className="size-4" strokeWidth={2} />} />
            <h1 className="font-bold text-3xl md:text-4xl text-text-dark tracking-tight">
              Feed de Passeios
            </h1>
          </div>
        </div>
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-16">
          <div className="bg-white rounded-xl shadow-sm border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-accent/10 flex items-center justify-center mx-auto mb-6">
              <Train className="size-8 text-blue-accent" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-text-dark mb-3">Acesso restrito</h2>
            <p className="text-text-secondary mb-2">
              Faça login como vagoneteiro para ver os passeios disponíveis e se auto-atribuir.
            </p>
            <p className="text-sm text-text-secondary">
              Ainda não é vagoneteiro? Fale com um administrador para se cadastrar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
      {/* Cabeçalho */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <SectionIcon icon={<Train className="size-4" strokeWidth={2} />} />
            <div>
              <h1 className="font-bold text-3xl md:text-4xl text-text-dark tracking-tight">
                Feed de Passeios
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {flat.length} passeio{flat.length !== 1 ? 's' : ''} disponível{flat.length !== 1 ? 'eis' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/minhas-atribuicoes')}
              className="inline-flex items-center gap-2 px-4 h-9 rounded-lg border border-blue-accent text-blue-accent text-sm font-semibold hover:bg-blue-accent hover:text-white transition-colors"
            >
              <ClipboardList className="size-4" />
              Minhas Atribuições
            </button>
            <div className="hidden sm:flex items-center gap-2 border-l border-border pl-3">
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

        {/* Filtro */}
        <div className="bg-white rounded-xl shadow-sm border border-border p-4 flex items-center gap-4">
          <SectionIcon icon={<CalendarDays className="size-4" strokeWidth={2} />} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
            <label className="text-sm font-medium text-text-dark whitespace-nowrap">
              Filtrar por mês:
            </label>
            <input
              type="month"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-sm text-text-dark focus:ring-2 focus:ring-blue-accent/30 focus:border-blue-accent outline-none bg-bg-light-2 transition"
            />
            {filtro && (
              <button
                onClick={() => setFiltro('')}
                className="text-xs text-text-secondary hover:text-text-dark transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
            <Loader2 className="size-8 animate-spin text-blue-accent" />
            <p className="text-sm">Carregando passeios...</p>
          </div>
        )}

        {/* Vazio */}
        {!loading && Object.keys(feed).length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-border py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-blue-accent/10 flex items-center justify-center">
              <SearchX className="size-7 text-blue-accent" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-text-dark">Nenhum passeio disponível</h3>
            <p className="text-sm text-text-secondary">Não há passeios com vagas para este período.</p>
          </div>
        )}

        {/* Feed por data */}
        {!loading && Object.entries(feed).map(([dataKey, items]) => (
          <div key={dataKey}>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                {formatarData(dataKey)}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <div
                  key={item.instanciaId}
                  className={`bg-white rounded-xl shadow-sm border transition-shadow hover:shadow-md ${
                    item.jaPeguei ? 'border-green-timeline/40' : 'border-border'
                  }`}
                >
                  <div className="p-4 flex items-center justify-between gap-4">
                    {/* Info do passeio */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-text-dark">{item.slot.titulo}</h3>
                        {item.jaPeguei && (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-timeline border border-green-timeline/30 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="size-3" />
                            Atribuído
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5 shrink-0" />
                          {item.slot.horario} · {item.slot.duracao}min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5 shrink-0" />
                          {item.vagas.disponiveis}/{item.vagas.total} vagas
                        </span>
                        <span className="font-semibold text-green-alt">
                          {formatarValor(item.slot.valor)}
                        </span>
                      </div>

                      {item.slot.descricao && (
                        <p className="text-xs text-text-secondary mt-1 truncate max-w-md">
                          {item.slot.descricao}
                        </p>
                      )}
                    </div>

                    {/* Botão pegar */}
                    <div className="shrink-0">
                      {item.jaPeguei ? (
                        <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-timeline border border-green-timeline/30 rounded-lg text-sm font-medium">
                          <CheckCircle2 className="size-4" />
                          Atribuído
                        </span>
                      ) : item.vagas.disponiveis <= 0 ? (
                        <span className="inline-block px-4 py-2 bg-bg-light-3 text-text-secondary rounded-lg text-sm">
                          Sem vagas
                        </span>
                      ) : (
                        <button
                          onClick={() => pegarPasseio(item.instanciaId)}
                          disabled={atribuindo === item.instanciaId}
                          className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            atribuindo === item.instanciaId
                              ? 'bg-bg-light-3 text-text-secondary cursor-wait'
                              : 'bg-blue-accent text-white hover:bg-blue active:scale-95 shadow-sm'
                          }`}
                        >
                          {atribuindo === item.instanciaId ? (
                            <><Loader2 className="size-4 animate-spin" /> Processando...</>
                          ) : (
                            <><CheckCircle2 className="size-4" /> Atribuir-me</>
                          )}
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
