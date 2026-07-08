import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle, UserCheck, MapPinPen} from "lucide-react";
import { api } from "../services/api";

type VagoneteiroResumo = {
  id: number;
  name: string;
  ativo: boolean;
};

export const CadastroPasseio: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [capacidade, setCapacidade] = useState("");
  const [preco, setPreco] = useState("");
  const [data, setData] = useState("");
  const [horario, setHorario] = useState("");
  const [vagSelecionado, setVagSelecionado] = useState<number | null>(null);
  const [vagoneteiros, setVagoneteiros] = useState<VagoneteiroResumo[]>([]);

  useEffect(() => {
    async function carregarVagoneteiros() {
      try {
        const res = await api.request<{ data: VagoneteiroResumo[] }>("/usuarios/vagoneteiros");
        // O endpoint retorna paginado: { data, total, page, totalPages }
        // Precisamos adaptar
        const body = await fetch(api.baseUrl + "/usuarios/vagoneteiros", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then(r => r.json());
        setVagoneteiros((body.data || body).map((u: any) => ({
          id: u.id,
          name: u.name,
          ativo: u.ativo,
        })));
      } catch {
        // fallback vazio
      }
    }
    carregarVagoneteiros();
  }, []);

  const handleCadastrar = async () => {
    if (!capacidade || !preco || !data || !horario || !vagSelecionado) {
      alert("Preencha todos os campos e selecione um vagoneteiro.");
      return;
    }

    setLoading(true);
    setApiError("");
    try {
      await api.request("/passeios", {
        method: "POST",
        body: JSON.stringify({
          preco: parseFloat(preco),
          capacidade: parseInt(capacidade, 10),
          data: new Date(data + "T" + horario + ":00-03:00").toISOString(),
          horario,
          usuarioId: vagSelecionado,
        }),
      });
      navigate("/painel-admin");
    } catch (err: any) {
      setApiError(err instanceof Error ? err.message : "Erro ao cadastrar passeio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light-1 flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-10 flex flex-col gap-0">

        {/* Título */}
        <div className="flex items-center gap-3 mb-8">
          <MapPinPen className="text-text-dark" size={28} strokeWidth={1.8} />
          <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
            Cadastrar Passeio
          </h1>
        </div>

        {/* Card: Informações do Passeio */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden mb-6">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <div className="w-9 h-9 rounded-lg bg-blue-accent/10 flex items-center justify-center text-blue-accent">
              <Users size={16} />
            </div>
            <div>
              <h2 className="font-bold text-base text-text-dark">Informações do Passeio</h2>
              <p className="text-xs text-text-secondary mt-0.5">Preencha os dados do novo horário disponível</p>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              {/* Capacidade */}
              <div>
                <label className="block text-xs font-semibold text-text-dark tracking-normal case-sensitive mb-1.5">
                  Capacidade
                </label>
                <input
                  type="number"
                  placeholder="Número de pessoas"
                  min={1}
                  max={30}
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                  className="w-full h-10.5 px-3.5 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent focus:ring-2 focus:ring-blue-accent/10 transition-colors placeholder:text-text-secondary/60"
                />
              </div>

              {/* Preço */}
              <div>
                <label className="block text-xs font-semibold text-text-dark tracking-normal case-sensitive mb-1.5">
                  Preço
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary font-medium pointer-events-none">
                    R$
                  </span>
                  <input
                    type="number"
                    placeholder="0,00"
                    min={0}
                    step={0.01}
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                    className="w-full h-10.5 pl-9 pr-3.5 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent focus:ring-2 focus:ring-blue-accent/10 transition-colors placeholder:text-text-secondary/60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Data */}
              <div>
                <label className="block text-xs font-semibold text-text-dark tracking-normal case-sensitive mb-1.5">
                  Data do Passeio
                </label>
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full h-10.5 px-3.5 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent focus:ring-2 focus:ring-blue-accent/10 transition-colors"
                />
              </div>

              {/* Horário */}
              <div>
                <label className="block text-xs font-semibold text-text-dark tracking-normal case-sensitive mb-1.5">
                  Horário
                </label>
                <input
                  type="time"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  className="w-full h-10.5 px-3.5 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent focus:ring-2 focus:ring-blue-accent/10 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card: Vagoneteiro Responsável */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
            <div className="w-9 h-9 rounded-lg bg-green-timeline/10 flex items-center justify-center text-green-timeline">
              <CheckCircle size={16} />
            </div>
            <div>
              <h2 className="font-bold text-base text-text-dark">Vagoneteiro Responsável</h2>
              <p className="text-xs text-text-secondary mt-0.5">Selecione o vagoneteiro que conduzirá o passeio</p>
            </div>
          </div>

          <div className="px-6 py-6">
            <label className="block text-xs font-semibold text-text-dark tracking-normal case-sensitive mb-1.5">
              Selecione o Vagoneteiro
            </label>
            <select
              value={vagSelecionado ?? ""}
              onChange={(e) => setVagSelecionado(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-10.5 px-3.5 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent focus:ring-2 focus:ring-blue-accent/10 transition-colors bg-white cursor-pointer appearance-none"
            >
              <option value="" disabled>Selecione um vagoneteiro</option>
              {vagoneteiros.filter(v => v.ativo).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-bg-light-2">
            {apiError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-2 mr-auto">{apiError}</p>
            )}
            <button
              onClick={ () => navigate("/painel-admin") }
              className="px-5 h-10.5 rounded-lg border border-border text-text-secondary text-sm font-semibold hover:bg-bg-light-1 hover:border-border-light transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleCadastrar}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 h-10.5 rounded-lg bg-blue-accent hover:bg-blue-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer">           
              {loading ? (
                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Cadastrando...</>
              ) : (
                <><UserCheck size={15} /> Cadastrar Passeio</>
              )}
            </button>
          </div>
        </div>

      </main>

    </div>
  );
};