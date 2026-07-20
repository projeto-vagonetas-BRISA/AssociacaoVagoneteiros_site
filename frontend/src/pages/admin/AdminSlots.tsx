import React, { useState } from "react";
import { api } from "../../services/api";
import { useNavigate } from "react-router-dom";

type TipoSlot = "FIXO" | "LOTE" | "INDIVIDUAL";

const DIAS_SEMANA = [
  "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO", "DOMINGO",
];

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

  // FIXO
  const [diaSemana, setDiaSemana] = useState("SEGUNDA");
  const [dataInicio, setDataInicio] = useState("");

  // LOTE (intervalo)
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
        // Título auto-gerado da data/hora do primeiro slot
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
        setSucesso(`${result.total} slots criados com sucesso!`);
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
        setSucesso(`Slot ${tipo} criado com sucesso!`);
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
      setErro(error instanceof Error ? error.message : "Erro ao criar slot");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Slots</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crie e configure slots de passeio (FIXO, LOTE ou INDIVIDUAL)
          </p>
        </div>
        <button
          onClick={() => navigate("/painel-admin")}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Voltar ao painel
        </button>
      </div>

      {erro && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {sucesso}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Tipo de Slot
          </label>
          <div className="flex gap-3">
            {(["FIXO", "LOTE", "INDIVIDUAL"] as TipoSlot[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                  tipo === t
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {t === "FIXO" ? "🔄 Fixo" : t === "LOTE" ? "📦 Lote" : "📅 Individual"}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {tipo === "FIXO" && "Repete semanalmente no mesmo dia e horário"}
            {tipo === "LOTE" && "Cria vários slots de uma vez em datas específicas"}
            {tipo === "INDIVIDUAL" && "Slot único em uma data específica"}
          </p>
        </div>

        {/* Descrição (comum a todos) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Descrição
          </label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {/* Campos comuns (ocultam duplicatas quando LOTE) */}
        {tipo !== "LOTE" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Passeio Matinal"
                required={tipo !== "LOTE"}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Hora Início <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Hora Fim <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Capacidade e Valor (comum a todos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Capacidade (vagas) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={capacidade}
              onChange={(e) => setCapacidade(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Campos específicos por tipo */}
        {tipo === "FIXO" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dia da Semana <span className="text-red-500">*</span>
              </label>
              <select
                value={diaSemana}
                onChange={(e) => setDiaSemana(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
              >
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se vazio, usa a data atual
              </p>
            </div>
          </div>
        )}

        {tipo === "LOTE" && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-600 mb-3 font-semibold">
              Gera slots a cada {loteDuracao || "X"} min, em cada dia do intervalo
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Data Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={loteDataInicio}
                  onChange={(e) => setLoteDataInicio(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Data Fim <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={loteDataFim}
                  onChange={(e) => setLoteDataFim(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Hora Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={loteHoraInicio}
                  onChange={(e) => setLoteHoraInicio(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Hora Fim <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={loteHoraFim}
                  onChange={(e) => setLoteHoraFim(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Duração (minutos) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="5"
                  value={loteDuracao}
                  onChange={(e) => setLoteDuracao(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>\            <p className="mt-3 text-xs text-purple-500">
              Serão gerados slots a cada {loteDuracao || "X"} min, das {loteHoraInicio} às {loteHoraFim}, para cada dia de {loteDataInicio || "início"} a {loteDataFim || "fim"}.
            </p>
          </div>
        )}

        {tipo === "INDIVIDUAL" && (
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xs text-green-600 mb-2">
              Slots INDIVIDUAL serão criados sem recorrência. Use LOTE para múltiplas datas.
            </p>
          </div>
        )}

        {/* Botão de envio */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Criando..." : `Criar Slot ${tipo}`}
          </button>
          <button
            type="button"
            onClick={() => navigate("/painel-admin")}
            className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};
