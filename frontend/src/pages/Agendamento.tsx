import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ArrowRight,
  CreditCard,
  Globe,
  ListOrdered,
  CheckCircle2
} from "lucide-react";
import { InformacoesPessoais } from "../components/InformacoesPessoaisForm";
import { HorariosDia } from "../components/HorariosDias";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../services/api";
import { getFcmToken } from "../services/firebase";

interface Passeio {
  id: number;
  preco: number;
  capacidade: number;
  data: string;
  horario: string;
  vagasDisponiveis: number;
  usuario: { id: number; name: string };
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toLocalDate(isoString: string) {
  const [datePart, timePart] = isoString.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (timePart) {
    const [hh, mm] = timePart.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm || 0);
  }
  return new Date(y, m - 1, d);
}

// Converte data ISO (data + horario separados) para Date
function passeioToDate(passeio: { data: string; horario: string }): Date {
  const d = new Date(passeio.data);
  const [hh, mm] = passeio.horario.split(":").map(Number);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d;
}

function formatHora(isoString: string) {
  const d = toLocalDate(isoString);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatHoraPasseio(passeio: { data: string; horario: string }): string {
  return passeio.horario;
}

function formatDataResumo(data: string): string {
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

const SectionIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
    {icon}
  </div>
);

export const Agendamento: React.FC = () => {
  const today = new Date();
  const { user, isAuthenticated } = useAuth();

  //formulario — preenche com dados do usuário logado
  const [isAgencia, setIsAgencia] = useState(false);
  const [nome, setNome] = useState(isAuthenticated && user ? user.name : "");
  const [telefone, setTelefone] = useState(isAuthenticated && user ? user.telefone : "");
  const [documento, setDocumento] = useState(isAuthenticated && user ? user.cpf : "");
  const [passageiros, setPassageiros] = useState(1);
  const [email, setEmail] = useState(isAuthenticated && user ? user.email || "" : "");
  const [formaPagamento, setFormaPagamento] = useState("credito");
  const [passeios, setPasseios] = useState<Passeio[]>([]);
  const [loadingPasseios, setLoadingPasseios] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [agendamentoConfirmado, setAgendamentoConfirmado] = useState<{ id: number; cliente: { nome: string }; passeio: { data: string; horario: string; preco: number } } | null>(null);

  // Carregar passeios da API
  useEffect(() => {
    setLoadingPasseios(true);
    api.request<{ data: Passeio[] }>('/agendamentos/vagas-disponiveis')
      .then(res => setPasseios(res.data))
      .catch(() => {})
      .finally(() => setLoadingPasseios(false));
  }, []);

  //calendário
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  //passeio selecionado
  const [selectedPasseio, setSelectedPasseio] = useState<Passeio | null>(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  
  const [consentimento, setConsentimento] = useState(false);
  const [consentimentoNotificacao, setConsentimentoNotificacao] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [ciente, setCiente] = useState(false);
  
  // dias do mês que possuem passeios disponíveis (para marcar no calendário)
  const daysWithPasseios = useMemo(() => {
    const set = new Set<number>();
    passeios.forEach((p) => {
      const d = new Date(p.data);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        set.add(d.getDate());
      }
    });
    return set;
  }, [currentMonth, currentYear, passeios]);

  // passeios do dia selecionado
  const passeiosDoDia = useMemo(() => {
    return passeios.filter((p) => {
      const d = new Date(p.data);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        d.getDate() === selectedDay
      );
    }).sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    );
  }, [currentYear, currentMonth, selectedDay, passeios]);

  // reset seleção de passeio ao mudar de dia
  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    setSelectedPasseio(null);
  };

  const isCurrentMonth = currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const prevMonth = () => {
    if (isCurrentMonth) return; // não voltar para meses passados
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
    setSelectedPasseio(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
    setSelectedPasseio(null);
  };

  // capacidade máxima do passeio selecionado
  const maxPassageiros = isAgencia ? 999 : (selectedPasseio?.vagasDisponiveis ?? 5);
  const precoUnitario = selectedPasseio ? Number(selectedPasseio.preco) : 0;
  const subtotal = precoUnitario * passageiros;

  // data formatada para o resumo
  const selectedDate = new Date(currentYear, currentMonth, selectedDay);
  const dataFormatada = `${DIAS_SEMANA[selectedDate.getDay()]}, ${String(selectedDay).padStart(2, "0")} de ${MESES[currentMonth]} de ${currentYear}`;

  // validação básica para habilitar "Finalizar"
  const podeFinalizarReserva =
    nome.trim() !== "" &&
    telefone.trim() !== "" &&
    (isAgencia ? (documento.trim() !== "" && email.trim() !== "") : email.trim() !== "") &&
    selectedPasseio !== null &&
    passageiros >= 1 &&
    ciente &&
    !submitting;

    useEffect(() => {
      setPassageiros(1);
    }, [isAgencia]);


  async function handleFinalizarReserva() {
    if (!podeFinalizarReserva || !selectedPasseio) return;
    setSubmitting(true);
    setSubmitError('');

    let token: string | undefined = undefined;
    if (consentimentoNotificacao) {
      try {
        token = await getFcmToken();
        setFcmToken(token);
      } catch (error) {
        console.error('Erro ao obter token FCM:', error);
        setSubmitError('Não foi possível obter o token de notificações.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const result = await api.request<{
        id: number;
        cliente: { nome: string };
        passeio: { data: string; horario: string; preco: number };
      }>('/agendamentos/publico', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          telefone,
          email: email.trim() || undefined,
          documento: documento.replace(/\D/g, '') || undefined,
          passeioId: selectedPasseio.id,
          acompanhantes: passageiros - 1,
          promocao: consentimento,
          notificacao: consentimentoNotificacao,
          ciente,
          fcmToken: consentimentoNotificacao ? token : undefined,
        }),
      });
      setAgendamentoConfirmado(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar agendamento';
      setSubmitError(message);
    }
    setSubmitting(false);
  }

  function handleNovoAgendamento() {
    setAgendamentoConfirmado(null);
    setSelectedPasseio(null);
    setSelectedDay(today.getDate());
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setPassageiros(1);
    setNome('');
    setTelefone('');
    setEmail('');
    setConsentimento(false);
    setConsentimentoNotificacao(false);
    setCiente(false);
    setSubmitError('');
  }

  return (
    <div className="flex flex-col items-start w-full bg-bg-light-1 min-h-screen">
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <SectionIcon icon={<Calendar className="size-4" strokeWidth={2} />} />
          <h1 className="font-bold text-3xl md:text-4xl text-text-dark tracking-tight">
            Agendamento
          </h1>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* coluna esquerda: formulário de agendamento */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-border">
              <div className="flex items-center gap-3">
                <SectionIcon
                  icon={<Globe className="size-4" strokeWidth={2} />}
                />
                <div>
                  <p className="font-semibold text-sm text-text-dark">
                    Você é uma agência de turismo?
                  </p>
                  <p className="font-normal text-xs text-text-secondary">
                    Agências possuem condições especiais de reserva e
                    faturamento.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/cadastro?tipo=empresa"
                  className="hidden sm:inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-dark bg-bg-light-2 hover:bg-bg-light-1 transition-colors cursor-pointer"
                >
                  Cadastrar empresa
                </Link>
                <button
                  onClick={() => {
                    setDocumento("");
                    setNome("");
                    setTelefone("");
                    setEmail("");
                    setIsAgencia((v) => !v);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAgencia ? "bg-blue-accent" : "bg-border-light"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isAgencia ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>

            {/* informações pessoais */}
            <InformacoesPessoais
              nome={nome}
              telefone={telefone}
              documento={documento}
              setNome={setNome}
              email={email}
              setEmail={setEmail}
              setTelefone={setTelefone}
              setDocumento={setDocumento}
              isAgencia={isAgencia}
              consentimento={consentimento}
              setConsentimento={setConsentimento}
              consentimentoNotificacao={consentimentoNotificacao}
              setConsentimentoNotificacao={setConsentimentoNotificacao}
            />

            {/* calendário + horários */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-4">
                <SectionIcon
                  icon={<Calendar className="size-4" strokeWidth={2} />}
                />
                <h2 className="font-semibold text-base text-text-dark">
                  Selecione a Data
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* calendário */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={prevMonth}
                      disabled={isCurrentMonth}
                      className={`p-1 rounded-lg transition-colors ${
                        isCurrentMonth
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:bg-bg-light-1'
                      }`}
                    >
                      <ChevronLeft
                        className="size-4 text-text-primary"
                        strokeWidth={2}
                      />
                    </button>
                    <span className="font-semibold text-sm text-text-dark">
                      {MESES[currentMonth]} {currentYear}
                    </span>
                    <button
                      onClick={nextMonth}
                      className="p-1 rounded-lg hover:bg-bg-light-1 transition-colors"
                    >
                      <ChevronRight
                        className="size-4 text-text-primary"
                        strokeWidth={2}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 mb-1">
                    {DIAS.map((d) => (
                      <div
                        key={d}
                        className="text-center font-medium text-xs text-[#9ca3af] py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-0.5">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`e${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const isSelected = day === selectedDay;
                      const hasPasseio = daysWithPasseios.has(day);
                      const isPast = isCurrentMonth && day < today.getDate();
                      return (
                        <button
                          key={day}
                          onClick={() => !isPast && handleSelectDay(day)}
                          className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-sm font-medium transition-colors
                            ${
                              isSelected
                                ? "bg-blue-accent text-white"
                                : isPast
                                  ? "text-[#e5e7eb] cursor-not-allowed"
                                  : hasPasseio
                                    ? "text-text-dark hover:bg-bg-light-1"
                                    : "text-[#c4c8d4] cursor-default"
                            }`}
                        >
                          {day}
                          {hasPasseio && !isSelected && !isPast && (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-green-timeline" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="w-2 h-2 rounded-full bg-green-timeline" />
                    <span className="font-normal text-xs text-text-secondary">
                      Alta disponibilidade
                    </span>
                  </div>
                </div>

                {/* horários do dia */}
                <HorariosDia
                  passeiosDoDia={passeiosDoDia}
                  selectedPasseio={selectedPasseio}
                  setSelectedPasseio={setSelectedPasseio}
                  setPassageiros={setPassageiros}
                  formatHora={formatHora}
                />
              </div>
            </div>

            {/* forma de pagamento + passageiros */}
            <div className="flex flex-col gap-5">
              {/* forma de pagamento */}
              <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-border">
                <div className="flex items-center gap-3">
                  <SectionIcon
                    icon={<CreditCard className="size-4" strokeWidth={2} />}
                  />
                  <div>
                    <p className="font-semibold text-sm text-text-dark">
                      Forma de Pagamento
                    </p>
                    <p className="font-normal text-xs text-text-secondary">
                      Selecione como deseja pagar. <b>Atenção: o pagamento será realizado no local, no dia do passeio.</b>
                    </p>
                  </div>
                </div>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="border border-border rounded-lg px-2 py-1.5 text-sm text-text-dark bg-bg-light-2 focus:outline-none focus:border-blue-accent transition-colors cursor-pointer max-w-30"
                >
                  <option value="credito">Crédito</option>
                  <option value="debito">Débito</option>
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>

              {/* passageiros */}
              <div className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-border">
                <div className="flex items-center gap-3">
                  <SectionIcon
                    icon={<ListOrdered className="size-4" strokeWidth={2} />}
                  />
                  <div>
                    <p className="font-semibold text-sm text-text-dark">
                      {isAgencia ? "Selecione o Número de Passageiros do Passeio" : "Número de Passageiros"}
                    </p>
                    <p className="font-normal text-xs text-text-secondary">
                      {selectedPasseio
                        ? `${isAgencia ? "Selecione o número total de passageiros para o passeio" : `Máximo ${selectedPasseio.vagasDisponiveis} passageiros para este horário` }`
                        : "Selecione um horário"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPassageiros((p) => Math.max(1, p - 1))}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-primary hover:bg-bg-light-1 transition-colors"
                  >
                    <Minus className="size-3.5" strokeWidth={2.5} />
                  </button>
                  <span className="font-bold text-lg text-text-dark w-6 text-center">
                    {passageiros}
                  </span>
                  <button
                    onClick={() =>
                      setPassageiros((p) => Math.min(maxPassageiros, p + 1))
                    }
                    disabled={!selectedPasseio}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text-primary hover:bg-bg-light-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="size-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* coluna direita: resumo da reserva */}
          <div className="bg-white rounded-xl overflow-hidden shadow-lg sticky top-6">
            <div className="px-6 py-5 border-b border-border bg-blue-accent">
              <h2 className="font-bold text-lg text-white tracking-tight">
                Resumo da Reserva
              </h2>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* data */}
              <div className="flex gap-3 items-start">
                <Calendar
                  className="size-4 shrink-0 text-blue-accent mt-0.5"
                  strokeWidth={2}
                />
                <div>
                  <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                    Data
                  </p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {dataFormatada}
                  </p>
                </div>
              </div>

              {/* endereço */}
              <div className="flex gap-3 items-start">
                <MapPin
                  className="size-4 shrink-0 text-blue-accent mt-0.5"
                  strokeWidth={2}
                />
                <div>
                  <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                    Endereço
                  </p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    Av. Rio Grande, s/n — Cassino, RS
                  </p>
                </div>
              </div>

              {/* horário */}
              <div className="flex gap-3 items-start">
                <Clock
                  className="size-4 shrink-0 text-blue-accent mt-0.5"
                  strokeWidth={2}
                />
                <div>
                  <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                    Horário
                  </p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {selectedPasseio
                      ? formatHoraPasseio(selectedPasseio)
                      : "—"}
                  </p>
                </div>
              </div>

              {/* passageiros */}
              <div className="flex gap-3 items-start">
                <Users
                  className="size-4 shrink-0 text-blue-accent mt-0.5"
                  strokeWidth={2}
                />
                <div>
                  <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                    Passageiros
                  </p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {passageiros} {passageiros === 1 ? "Pessoa" : "Pessoas"}
                  </p>
                </div>
              </div>

              {/* forma de pagamento */}
              <div className="flex gap-3 items-start">
                <CreditCard
                  className="size-4 shrink-0 text-blue-accent mt-0.5"
                  strokeWidth={2}
                />
                <div>
                  <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                    Forma de Pagamento
                  </p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {formaPagamento.charAt(0).toUpperCase() + formaPagamento.slice(1)}
                  </p>
                </div>
              </div>

              {/* estou Ciente checkbox obrigatório */}
              <label
                className={`flex gap-3 items-start rounded-lg p-3 cursor-pointer transition-colors select-none
                  ${ciente ? "bg-blue-accent/8 border border-blue-accent/30" : "bg-bg-light-1 border border-transparent hover:border-border"}`}
              >
                <div className="mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={ciente}
                    onChange={(e) => setCiente(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors
                      ${ciente ? "bg-blue-accent border-blue-accent" : "bg-white border-border"}`}
                  >
                    {ciente && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        viewBox="0 0 10 8"
                        fill="none"
                      >
                        <path
                          d="M1 4l3 3 5-6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-[10px] text-[#7a8392] uppercase tracking-widest">
                    Estou Ciente{" "}
                    <span className="text-red-dark normal-case tracking-normal font-bold">*</span>
                  </p>
                  <p className="font-normal text-xs text-text-primary leading-relaxed mt-0.5">
                    Os passeios estão sujeitos a condições climáticas. Em caso
                    de imprevistos, a associação entrará em contato para
                    realizar o reagendamento.
                  </p>
                </div>
              </label>

              <div className="border-t border-border" />

              {/* preço */}
              <div className="flex flex-col gap-2">
                {selectedPasseio && (
                  <div className="flex justify-between items-center">
                    <span className="font-normal text-xs text-[#7a8392]">
                      R$ {precoUnitario.toFixed(2).replace('.', ',')} × {passageiros}{" "}
                      {passageiros === 1 ? "pessoa" : "pessoas"}
                    </span>
                    <span className="font-semibold text-sm text-text-primary">
                      R$ {subtotal.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base text-text-primary">Total</span>
                  <span className="font-bold text-xl text-red-dark">
                    {selectedPasseio
                      ? `R$ ${subtotal.toFixed(2).replace(".", ",")}`
                      : "—"}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="rounded-lg bg-red-dark/10 border border-red-dark/30 px-4 py-3">
                  <p className="text-sm text-red-dark text-center">{submitError}</p>
                </div>
              )}

              {agendamentoConfirmado ? (
                <div className="rounded-lg bg-green-timeline/10 border border-green-timeline/30 px-4 py-5 text-center">
                  <CheckCircle2 className="size-10 text-green-timeline mx-auto mb-2" strokeWidth={1.5} />
                  <p className="font-bold text-base text-green-timeline">Agendamento Confirmado!</p>
                  <p className="text-xs text-text-primary mt-1">
                    {agendamentoConfirmado.cliente.nome} — {formatHoraPasseio(agendamentoConfirmado.passeio)} em {formatDataResumo(agendamentoConfirmado.passeio.data)}
                  </p>
                  <p className="text-xs text-[#7a8394] mt-2">
                    Protocolo: #{agendamentoConfirmado.id}
                  </p>
                  <button
                    onClick={handleNovoAgendamento}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-blue-accent hover:opacity-90 transition-opacity rounded-lg py-3 font-bold text-sm text-white tracking-wide"
                  >
                    Novo Agendamento
                    <ArrowRight className="size-4" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  disabled={!podeFinalizarReserva}
                  className="w-full flex items-center justify-center gap-2 bg-red-dark hover:bg-red-hover active:bg-[#8a1020] transition-colors rounded-lg py-3.5 font-bold text-base text-white tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-dark"
                  onClick={handleFinalizarReserva}
                >
                  {submitting ? 'Agendando...' : 'Finalizar Reserva'}
                  <ArrowRight className="size-4" strokeWidth={2.5} />
                </button>
              )}

              {!agendamentoConfirmado && !podeFinalizarReserva && (
                <p className="text-[10px] text-[#9ca3af] text-center -mt-2">
                  {!ciente
                    ? "Confirme que está ciente das condições para continuar."
                    : "Preencha seus dados e selecione um horário para continuar."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};