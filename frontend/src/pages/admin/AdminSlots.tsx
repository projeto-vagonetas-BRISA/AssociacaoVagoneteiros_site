import React, { useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, RefreshCw, Layers, Calendar, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type TipoSlot = "FIXO" | "LOTE" | "INDIVIDUAL";

const DIAS_SEMANA = [
  "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO",
];

const TIPO_CONFIG: Record<TipoSlot, { label: string; desc: string; icon: React.ReactNode; activeBg: string; activeText: string; activeBorder: string }> = {
  FIXO: {
    label: "Fixo",
    desc: "Repete semanalmente no mesmo dia e horário",
    icon: <RefreshCw className="size-4" />,
    activeBg: "bg-blue-accent/10",
    activeText: "text-blue-accent",
    activeBorder: "border-blue-accent",
  },
  LOTE: {
    label: "Lote",
    desc: "Cria vários horários de uma vez em datas específicas",
    icon: <Layers className="size-4" />,
    activeBg: "bg-blue-accent/10",
    activeText: "text-blue-accent",
    activeBorder: "border-blue-accent",
  },
  INDIVIDUAL: {
    label: "Individual",
    desc: "Horário único em uma data específica",
    icon: <Calendar className="size-4" />,
    activeBg: "bg-blue-accent/10",
    activeText: "text-blue-accent",
    activeBorder: "border-blue-accent",
  },
};

const inputClass = "w-full rounded-lg border border-border px-3 py-2.5 text-sm text-text-dark bg-bg-light-2 focus:ring-2 focus:ring-blue-accent/30 focus:border-blue-accent outline-none transition placeholder:text-text-secondary";
const labelClass = "block text-sm font-semibold text-text-dark mb-1.5";

export const AdminSlots: React.FC = () => {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoSlot>("FIXO");
  const [loading, setLoading] = useState(false);

  // Campos comuns
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("09:30");
  const [capacidade, setCapacidade] = useState("5");
  const [valor, setValor] = useState("30");

  // Campos de Horário Fixo
  const [diaSemana, setDiaSemana] = useState("SEGUNDA");
  const [dataInicio, setDataInicio] = useState("");

  // Campos de Geração em Lote
  const [loteDataInicio, setLoteDataInicio] = useState("");
  const [loteDataFim, setLoteDataFim] = useState("");
  const [loteHoraInicio, setLoteHoraInicio] = useState("08:00");
  const [loteHoraFim, setLoteHoraFim] = useState("17:00");
  const [loteDuracao, setLoteDuracao] = useState("40");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setLoading(true);

    try {
      if (tipo === "LOTE") {
        const autoTitulo = `Passeio ${loteHoraInicio}`;
        const body: any = {
          titulo: autoTitulo,
          descricao: descricao || undefined,
          horaInicio: loteHoraInicio,
          horaFim: loteHoraFim,
          duracaoMinutos: parseInt(loteDuracao),
          capacidade: parseInt(capacidade),
          valor,
          dataInicio: loteDataInicio,
          dataFim: loteDataFim,
        };
        const result = await api.request<{ total: number }>("/slots/lotes/gerar", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setSucesso(`${result.total} horários criados com sucesso!`);
      } else {
        const body: any = {
          tipo,
          titulo,
          descricao: descricao || undefined,
          horaInicio,
          horaFim,
          capacidade: parseInt(capacidade),
          valor,
        };

        if (tipo === "FIXO") {
          body.diaSemana = diaSemana;
          if (dataInicio) body.dataInicio = dataInicio;
        }

        await api.request("/slots", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setSucesso(`Horário ${tipo} criado com sucesso!`);
      }

      // Limpar form
      setTitulo("");
      setDescricao("");
      setHoraInicio("08:00");
      setHoraFim("09:30");
      setCapacidade("5");
      setValor("30");
      setLoteDataInicio("");
      setLoteDataFim("");
      setLoteHoraInicio("08:00");
      setLoteHoraFim("17:00");
      setLoteDuracao("40");
      setDataInicio("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar horário");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
      {/* Cabeçalho */}
      <div className="max-w-3xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/painel-admin")}
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Voltar ao painel"
          >
            <ArrowLeft size={20} className="text-text-dark" />
          </button>
          <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
            <Settings className="size-4" strokeWidth={2} />
          </div>
          <div>
            <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
              Gerenciar Horários de Passeio
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Crie e configure horários de passeio - Fixo, Lote ou Individual
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto px-4 md:px-8 pb-16">
        {/* Alertas */}
        {erro && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-red/10 border border-red/20 rounded-xl text-red text-sm font-medium">
            <AlertCircle className="size-4 shrink-0" />
            {erro}
          </div>
        )}
        {sucesso && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-timeline/30 rounded-xl text-green-timeline text-sm font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            {sucesso}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Seleção de Tipo */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <p className={labelClass}>Tipo de Horário</p>
            <div className="flex flex-wrap gap-3">
              {(["FIXO", "LOTE", "INDIVIDUAL"] as TipoSlot[]).map((t) => {
                const cfg = TIPO_CONFIG[t];
                const ativo = tipo === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${ativo
                        ? `${cfg.activeBorder} ${cfg.activeBg} ${cfg.activeText}`
                        : "border-border bg-bg-light-1 text-text-secondary hover:bg-bg-light-3"
                      }`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {TIPO_CONFIG[tipo].desc}
            </p>
          </div>

          {/* Campos comuns */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
            <p className="text-sm font-semibold text-text-dark border-b border-border pb-3">
              Configuração Geral
            </p>

            {/* Descrição */}
            <div>
              <label className={labelClass}>Descrição</label>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>

            {/* Título + Horas (oculto no Lote) */}
            {tipo !== "LOTE" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Título <span className="text-red">*</span>
                  </label>
                  <input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Passeio Matinal"
                    required={tipo !== "LOTE"}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Hora Início <span className="text-red">*</span>
                  </label>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Hora Fim <span className="text-red">*</span>
                  </label>
                  <input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Capacidade e Valor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Capacidade (vagas) <span className="text-red">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Valor (R$) <span className="text-red">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Campos específicos — FIXO */}
          {tipo === "FIXO" && (
            <div className="bg-white rounded-xl border border-blue-accent/30 shadow-sm p-5 flex flex-col gap-4">
              <p className="text-sm font-semibold text-blue-accent border-b border-border pb-3">
                Configuração de Recorrência
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Dia da Semana <span className="text-red">*</span>
                  </label>
                  <select
                    value={diaSemana}
                    onChange={(e) => setDiaSemana(e.target.value)}
                    className={inputClass}
                  >
                    {DIAS_SEMANA.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0) + d.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data de Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Se vazio, usa a data atual
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campos específicos — LOTE */}
          {tipo === "LOTE" && (
            <div className="bg-white rounded-xl border border-blue-accent/30 shadow-sm p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <p className="text-sm font-semibold text-blue-accent">
                  Configuração do Lote
                </p>
                <span className="text-xs text-text-secondary bg-bg-light-1 border border-border px-2 py-0.5 rounded-full">
                  1 horário a cada {loteDuracao || "?"} min
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Data Início <span className="text-red">*</span>
                  </label>
                  <input
                    type="date"
                    value={loteDataInicio}
                    onChange={(e) => setLoteDataInicio(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Data Fim <span className="text-red">*</span>
                  </label>
                  <input
                    type="date"
                    value={loteDataFim}
                    onChange={(e) => setLoteDataFim(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Hora Início <span className="text-red">*</span>
                  </label>
                  <input
                    type="time"
                    value={loteHoraInicio}
                    onChange={(e) => setLoteHoraInicio(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Hora Fim <span className="text-red">*</span>
                  </label>
                  <input
                    type="time"
                    value={loteHoraFim}
                    onChange={(e) => setLoteHoraFim(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Duração (minutos) <span className="text-red">*</span>
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={loteDuracao}
                    onChange={(e) => setLoteDuracao(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-xs text-text-secondary bg-bg-light-1 border border-border rounded-lg px-3 py-2">
                Horários gerados das <strong>{loteHoraInicio}</strong> às <strong>{loteHoraFim}</strong>, a cada <strong>{loteDuracao || "?"} min</strong>, de <strong>{loteDataInicio || "início"}</strong> a <strong>{loteDataFim || "fim"}</strong>.
              </p>
            </div>
          )}

          {/* Individual — info */}
          {tipo === "INDIVIDUAL" && (
            <div className="bg-bg-light-1 border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-text-secondary">
                Horários <strong>Individuais</strong> são criados sem recorrência. Use <strong>Lote</strong> para múltiplas datas.
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-accent hover:bg-blue text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-sm"
            >
              {loading ? (
                <><Loader2 className="size-4 animate-spin" /> Criando...</>
              ) : (
                `Criar Horário ${tipo}`
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate("/painel-admin")}
              className="px-6 py-3 bg-bg-light-1 border border-border text-text-dark font-semibold rounded-lg hover:bg-bg-light-3 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
