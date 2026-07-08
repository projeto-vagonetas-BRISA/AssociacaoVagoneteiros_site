import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Calendar, Star, Clock, MapPin, Briefcase, Mail } from "lucide-react";
import { api } from "../../services/api";

interface VagoneteiroDetalhe {
  id: number;
  name: string;
  cpf: string;
  email: string | null;
  telefone: string;
  perfil: string;
  historico: string | null;
  experiencia: string | null;
  ativo: boolean;
  data_associacao: string;
  foto: string | null;
  createdAt: string;
  updatedAt: string;
  passeios: {
    id: number;
    data: string;
    valor: number;
    capacidade: number;
  }[];
}

const formatCpf = (cpf: string) => {
  if (!cpf || cpf.length !== 11) return cpf;
  return `${cpf.slice(0,3)}.${cpf.slice(3,6)}.${cpf.slice(6,9)}-${cpf.slice(9)}`;
};

const formatTel = (tel: string) => {
  const digits = tel.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  return tel;
};

const formatDataBr = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const experienciaLabels: Record<string, string> = {
  "Menos de 1 ano": "Menos de 1 ano",
  "1 a 3 anos": "1 a 3 anos",
  "3 a 5 anos": "3 a 5 anos",
  "5 a 10 anos": "5 a 10 anos",
  "Mais de 10 anos": "Mais de 10 anos",
};

export const VagoneteiroPerfil: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vagoneteiro, setVagoneteiro] = useState<VagoneteiroDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.request<VagoneteiroDetalhe>(`/usuarios/${id}`)
      .then(setVagoneteiro)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light-1 flex items-center justify-center">
        <p className="text-text-primary">Carregando...</p>
      </div>
    );
  }

  if (!vagoneteiro) {
    return (
      <div className="min-h-screen bg-bg-light-1 flex flex-col items-center justify-center gap-4">
        <p className="text-text-primary">Vagoneteiro não encontrado</p>
        <Link to="/painel-admin" className="text-blue-accent hover:underline text-sm">Voltar ao painel</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light-1 flex flex-col">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 py-10">
        {/* Topo */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/painel-admin')} className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-text-dark" />
          </button>
          <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">Perfil do Vagoneteiro</h1>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
          {/* Header com foto */}
          <div className="bg-gradient-to-r from-blue-accent/10 to-blue-accent/5 px-8 py-8 flex items-center gap-6">
            {vagoneteiro.foto ? (
              <img
                src={`data:image/jpeg;base64,${vagoneteiro.foto}`}
                alt={vagoneteiro.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-accent/20 text-blue-accent border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold">
                {vagoneteiro.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-text-dark">{vagoneteiro.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  vagoneteiro.ativo
                    ? "bg-green-timeline/10 text-green-timeline border border-green-timeline/20"
                    : "bg-red-dark/10 text-red-dark border border-red-dark/20"
                }`}>
                  {vagoneteiro.ativo ? "Ativo" : "Inativo"}
                </span>
                <span className="text-xs uppercase tracking-wider text-[#7a8394] font-semibold">
                  {vagoneteiro.perfil}
                </span>
              </div>
            </div>
          </div>

          {/* Corpo do perfil */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Coluna 1: Dados pessoais */}
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-[#7a8394] uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Dados Pessoais
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#7a8394]">CPF</p>
                    <p className="text-sm font-medium text-text-dark">{formatCpf(vagoneteiro.cpf)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#7a8394]">Telefone</p>
                    <p className="text-sm font-medium text-text-dark">{formatTel(vagoneteiro.telefone)}</p>
                  </div>
                </div>

                {vagoneteiro.email && (
                  <div className="flex items-start gap-3">
                    <Mail size={16} className="text-blue-accent mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-[#7a8394]">E-mail</p>
                      <p className="text-sm font-medium text-text-dark">{vagoneteiro.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#7a8394]">Data de Associação</p>
                    <p className="text-sm font-medium text-text-dark">{formatDataBr(vagoneteiro.data_associacao)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Profissional */}
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-[#7a8394] uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={14} /> Dados Profissionais
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#7a8394]">Experiência</p>
                    <p className="text-sm font-medium text-text-dark">
                      {experienciaLabels[vagoneteiro.experiencia ?? ""] || vagoneteiro.experiencia || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#7a8394]">Histórico</p>
                    <p className="text-sm font-medium text-text-dark">
                      {vagoneteiro.historico || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Star size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-[#7a8394]">Total de Passeios</p>
                    <p className="text-sm font-medium text-text-dark">
                      {vagoneteiro.passeios.length} passeio{vagoneteiro.passeios.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passeios realizados */}
          {vagoneteiro.passeios.length > 0 && (
            <div className="border-t border-border px-8 py-6">
              <h3 className="font-bold text-sm text-[#7a8394] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={14} /> Passeios Realizados
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 text-xs font-semibold text-[#7a8394]">Data</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-[#7a8394]">Valor</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-[#7a8394]">Capacidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vagoneteiro.passeios.map(p => (
                      <tr key={p.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 text-text-dark">{formatDataBr(p.data)}</td>
                        <td className="py-3 pr-4 text-green-timeline font-semibold">R$ {Number(p.valor).toFixed(2)}</td>
                        <td className="py-3 pr-4 text-text-primary">{p.capacidade} vagas</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="mt-6 flex gap-3">
          <Link
            to="/painel-admin"
            className="px-4 py-2 rounded-lg border border-border bg-white hover:bg-bg-light-1 text-text-dark text-sm font-semibold transition-colors"
          >
            ← Voltar ao Painel
          </Link>
        </div>
      </main>
    </div>
  );
};
