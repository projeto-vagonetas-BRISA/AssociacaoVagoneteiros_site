import React, { useMemo, useState } from "react";
import { Calendar, Clock, Search, ShieldCheck, Users, CircleAlert, MapPin, CheckCircle2, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { api } from "../services/api";
import conteudo from "../assets/conteudo.json";

type SituacaoAgendamento = "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "REALIZADO";

interface AgendamentoResponse {
  id: number;
  cpf: string;
  situacao: SituacaoAgendamento;
  data: string;
  horario: string;
  vagas: number;
  total: number;
  cliente: string;
}

const SITUACAO_LABEL: Record<SituacaoAgendamento, string> = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  CANCELADO: "Cancelado",
  REALIZADO: "Realizado",
};

const SITUACAO_STYLE: Record<SituacaoAgendamento, string> = {
  PENDENTE: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  CONFIRMADO: "bg-green-timeline/10 text-green-timeline border-green-timeline/25",
  CANCELADO: "bg-red-dark/10 text-red-dark border-red-dark/25",
  REALIZADO: "bg-blue-accent/10 text-blue-accent border-blue-accent/25",
};

const SITUACAO_CARD_STYLE: Record<SituacaoAgendamento, string> = {
  PENDENTE: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  CONFIRMADO: "border-green-timeline/20 bg-green-timeline/10 text-green-timeline",
  CANCELADO: "border-red-dark/20 bg-red-dark/10 text-red-dark",
  REALIZADO: "border-blue-accent/20 bg-blue-accent/10 text-blue-accent",
};

function normalizarCpf(valor: string) {
  return valor.replace(/\D/g, "");
}

function formatarCpf(valor: string) {
  const cpf = normalizarCpf(valor).slice(0, 11);
  return cpf
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatarData(data: string) {
  const datePart = data.split('T')[0];
  return new Date(`${datePart}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const SectionIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
    {icon}
  </div>
);

export const ConsultaAgendamento: React.FC = () => {
  const [id, setId] = useState("");
  const [cpf, setCpf] = useState("");
  const [consulta, setConsulta] = useState<AgendamentoResponse | null>(null);
  const [erro, setErro] = useState("");

  const podeConsultar = useMemo(() => id.trim() !== "" && normalizarCpf(cpf).length === 11, [id, cpf]);
  const [loading, setLoading] = useState(false);

  function handleConsulta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!podeConsultar) return;

    setLoading(true);
    setErro("");
    setConsulta(null);

    const idNumero = Number(id);
    const cpfLimpo = normalizarCpf(cpf);

    api.request<AgendamentoResponse>(`/agendamentos/consulta/${idNumero}/${cpfLimpo}`)
      .then((data) => {
        setConsulta(data);
      })
      .catch((err: any) => {
        setErro(err.message || "Erro ao consultar agendamento");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const [isDownloading, setIsDownloading] = useState(false);

  const gerarPDF = async () => {
    const element = document.getElementById("resumo-pedido");
    if (!element) return;

    setIsDownloading(true);
    try {
      const dataUrl = await toPng(element, { cacheBust: true, quality: 1, pixelRatio: 2 });
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Resumo_Agendamento_${consulta?.id}.pdf`);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      alert("Houve um erro ao gerar o PDF. Detalhes: " + error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <SectionIcon icon={<Search className="size-4" strokeWidth={2} />} />
          <h1 className="font-bold text-3xl md:text-4xl text-text-dark tracking-tight">
            Consulta de Agendamento
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-sm md:text-base text-text-secondary leading-relaxed">
          Consulte a situação do agendamento informando o ID e o CPF. 
        </p>
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-16">
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
            <div className="flex items-center gap-2 mb-4">
              <SectionIcon icon={<ShieldCheck className="size-4" strokeWidth={2} />} />
              <div>
                <h2 className="font-semibold text-base text-text-dark">Identificação do agendamento</h2>
                <p className="font-normal text-xs text-text-secondary">Use os dados recebidos na confirmação do passeio.</p>
              </div>
            </div>

            <form className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3" onSubmit={handleConsulta}>
              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">ID</span>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  placeholder="Ex.: 4821"
                  className="rounded-lg border border-border bg-bg-light-2 px-3 py-3 text-sm text-text-dark outline-none transition-colors placeholder:text-[#a7adb8] focus:border-blue-accent"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">CPF</span>
                <input
                  value={cpf}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  className="rounded-lg border border-border bg-bg-light-2 px-3 py-3 text-sm text-text-dark outline-none transition-colors placeholder:text-[#a7adb8] focus:border-blue-accent"
                />
              </label>

              <button
                type="submit"
                disabled={!podeConsultar}
                className="inline-flex h-11.5 items-center justify-center gap-2 self-end rounded-lg bg-red-dark px-4 font-bold text-sm text-white transition-colors hover:bg-red-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="size-4" strokeWidth={2.5} />
                Consultar
              </button>
            </form>
          </div>

          <div id="resumo-pedido" className="bg-white rounded-xl overflow-hidden shadow-lg sticky top-6">
            <div className="px-6 py-5 border-b border-blue-accent/15 bg-blue-accent">
              <h2 className="font-bold text-lg text-white tracking-tight">
                Agendamento {consulta ? `#${consulta.id}` : ""}
              </h2>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {consulta ? (
                <>
                  <div className={`rounded-lg border px-4 py-3 ${SITUACAO_CARD_STYLE[consulta.situacao]}`}>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="size-5 shrink-0" strokeWidth={2} />
                      <div>
                        <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                          Situação
                        </p>
                        <p className={`inline-flex mt-1 rounded-full border px-2.5 py-1 text-xs font-bold bg-white ${SITUACAO_STYLE[consulta.situacao]}`}>
                          {SITUACAO_LABEL[consulta.situacao]}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <SectionIcon icon={<Users className="size-4" strokeWidth={2} />} />
                    <div>
                        <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                            Responsável
                        </p>
                        <p className="font-bold text-lg text-text-primary mt-0.5">
                            {consulta.cliente}
                        </p>
                        <p className="font-semibold text-sm text-text-primary mt-0.5">
                            {formatarCpf(consulta.cpf)}
                        </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <Calendar className="size-4 shrink-0 text-blue-accent mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                        Data
                      </p>
                      <p className="font-semibold text-sm text-text-primary mt-0.5">
                        {formatarData(consulta.data)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <MapPin className="size-4 shrink-0 text-blue-accent mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                        Endereço
                      </p>
                      <p className="font-semibold text-sm text-text-primary mt-0.5">
                        {conteudo.rodape_localizacao.endereco}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <Clock className="size-4 shrink-0 text-blue-accent mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                        Horário
                      </p>
                      <p className="font-semibold text-sm text-text-primary mt-0.5">
                        {consulta.horario}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <Users className="size-4 shrink-0 text-blue-accent mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                        Passageiros
                      </p>
                      <p className="font-semibold text-sm text-text-primary mt-0.5">
                        {consulta.vagas} {consulta.vagas === 1 ? "Pessoa" : "Pessoas"}
                      </p>
                    </div>
                  </div>

                  <label className="flex gap-3 items-start rounded-lg p-3 cursor-pointer transition-colors select-none bg-bg-light-1 border border-transparent hover:border-border">

                    <div>

                      <p className="font-normal text-xs text-text-primary leading-relaxed mt-0.5">
                        Os passeios estão sujeitos a condições climáticas. Em caso de imprevistos, a associação entrará em contato para realizar o reagendamento.
                      </p>
                    </div>
                  </label>

                  <div className="border-t border-border" />

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-normal text-xs text-[#7a8392]">
                        #{consulta.id} consultado
                      </span>
                      <span className="font-semibold text-sm text-text-primary">
                        {formatarCpf(consulta.cpf)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base text-text-primary">Total</span>
                      <span className="font-bold text-xl text-red-dark">R$ {consulta.total.toFixed(2)}</span>
                    </div>
                  </div>
                
                  {/* Botão de Download PDF */}
                  <div className="pt-2">
                    <button
                      onClick={gerarPDF}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-center gap-2 h-11 bg-bg-light-2 hover:bg-border text-text-dark font-bold text-sm rounded-lg transition-colors border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <>Gerando PDF...</>
                      ) : (
                        <>
                          <Download className="size-4" strokeWidth={2.5} />
                          Baixar Resumo em PDF
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : erro ? (
                <div className="rounded-xl bg-red-dark/10 border border-red-dark/30 px-5 py-5">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="size-5 text-red-dark mt-0.5 shrink-0" strokeWidth={2} />
                    <div>
                      <p className="text-sm font-bold text-red-dark leading-relaxed">{erro}</p>
                      <p className="mt-2 text-xs text-[#7a8394] leading-relaxed">
                        Confira se o ID e o CPF foram digitados corretamente.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white px-5 py-7 text-center border border-border shadow-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-accent/10 text-blue-accent">
                    <Search className="size-5" strokeWidth={2.4} />
                  </div>
                  <p className="font-bold text-base text-text-dark">Os detalhes do passeio vão aparecer aqui</p>
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                    Informe o ID e o CPF acima para visualizar as informações do seu passeio.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};