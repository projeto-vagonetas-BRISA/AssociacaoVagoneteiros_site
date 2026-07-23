import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Calendar, Star, Clock, MapPin, Briefcase, Mail, Pencil, X, Check, Camera, UserCheck, AlertCircle, Loader2 } from "lucide-react";
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
    preco: number;
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

const unformatTel = (tel: string) => (tel || '').replace(/\D/g, '');

const formatDataBr = (iso: string) => {
  if (!iso) return '';
  const datePart = iso.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};

const experienciaOptions = [
  { value: "", label: "Selecione" },
  { value: "Menos de 1 ano", label: "Menos de 1 ano" },
  { value: "1 a 3 anos", label: "1 a 3 anos" },
  { value: "3 a 5 anos", label: "3 a 5 anos" },
  { value: "5 a 10 anos", label: "5 a 10 anos" },
  { value: "Mais de 10 anos", label: "Mais de 10 anos" },
];

const inputClass = "text-sm font-medium text-text-dark bg-bg-light-2 border border-border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-accent/30 focus:border-blue-accent transition placeholder:text-text-secondary";

export const VagoneteiroPerfil: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vagoneteiro, setVagoneteiro] = useState<VagoneteiroDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTel, setFormTel] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formHistorico, setFormHistorico] = useState("");
  const [formExperiencia, setFormExperiencia] = useState("");
  const [formPerfil, setFormPerfil] = useState("VAGONETEIRO");
  const [formFoto, setFormFoto] = useState<string | null>(null);
  const [fotoAlterada, setFotoAlterada] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.request<VagoneteiroDetalhe>(`/usuarios/${id}`)
      .then(d => {
        setVagoneteiro(d);
        populateForm(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function populateForm(d: VagoneteiroDetalhe) {
    setFormName(d.name);
    setFormTel(d.telefone);
    setFormEmail(d.email || "");
    setFormHistorico(d.historico || "");
    setFormPerfil(d.perfil || "VAGONETEIRO");
    setFormExperiencia(d.experiencia || "");
    setFormFoto(null);
    setFotoAlterada(false);
  }

  function entrarEdicao() {
    if (!vagoneteiro) return;
    populateForm(vagoneteiro);
    setEditando(true);
  }

  function cancelarEdicao() {
    setEditando(false);
    setFormFoto(null);
    setFotoAlterada(false);
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormFoto(e.target?.result as string);
      setFotoAlterada(true);
    };
    reader.readAsDataURL(file);
  }

  async function salvar() {
    if (!vagoneteiro) return;
    setSalvando(true);
    setErroSalvar(null);
    try {
      const body: any = {
        name: formName,
        telefone: unformatTel(formTel),
        email: formEmail || null,
        historico: formHistorico || null,
        experiencia: formExperiencia || null,
      };
      if (formPerfil !== vagoneteiro.perfil) {
        await api.request(`/usuarios/${vagoneteiro.id}/perfil`, {
          method: 'PATCH',
          body: JSON.stringify({ perfil: formPerfil }),
        });
      }
      if (fotoAlterada) {
        body.foto = formFoto || null;
      }
      const updated = await api.request<VagoneteiroDetalhe>(`/usuarios/${vagoneteiro.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setVagoneteiro(updated);
      setEditando(false);
      setFotoAlterada(false);
      setFormFoto(null);
    } catch (err: any) {
      setErroSalvar(err instanceof Error ? err.message : 'Erro ao salvar');
    }
    setSalvando(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-light-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 text-blue-accent animate-spin" />
        <p className="text-text-secondary text-sm font-medium">Carregando perfil...</p>
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
    <div className="min-h-screen bg-bg-light-1 flex flex-col items-start w-full">
      {/* Topo / Cabeçalho */}
      <div className="max-w-4xl w-full mx-auto px-4 md:px-8 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/painel-admin')} className="p-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer" aria-label="Voltar ao painel">
              <ArrowLeft size={20} className="text-text-dark" />
            </button>
            <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
              <User className="size-4" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-bold text-2xl md:text-3xl text-text-dark tracking-tight">
                {editando ? "Editando Vagoneteiro" : "Perfil do Vagoneteiro"}
              </h1>
              <p className="text-sm text-text-secondary mt-0.5">
                Gerencie as informações do associado
              </p>
            </div>
          </div>
          {!editando && (
            <button
              onClick={entrarEdicao}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-accent hover:bg-blue text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Pencil size={15} /> Editar
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-8 pb-16">
        
        {/* Erro */}
        {erroSalvar && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-red/10 text-red border border-red/20 text-sm font-medium">
            <AlertCircle className="size-4 shrink-0" />
            {erroSalvar}
          </div>
        )}

        {/* Card principal */}
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          {/* Header com foto */}
          <div className="bg-gradient-to-r from-blue-accent/10 to-blue-accent/5 px-8 py-8 flex items-center gap-6 relative border-b border-border">
            {/* Foto com hover para trocar (quando editando) */}
            <div className="relative shrink-0">
              {(editando && fotoAlterada && formFoto) ? (
                <img src={formFoto} alt="Nova foto" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
              ) : vagoneteiro.foto && !fotoAlterada ? (
                <img src={`data:image/jpeg;base64,${vagoneteiro.foto}`} alt={vagoneteiro.name} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-accent/20 text-blue-accent border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold">
                  {(vagoneteiro.name || '?').charAt(0).toUpperCase()}
                </div>
              )}
              {editando && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-accent text-white flex items-center justify-center shadow-md hover:bg-blue transition-colors cursor-pointer"
                    title="Alterar foto"
                  >
                    <Camera size={14} />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" />
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {editando ? (
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="text-2xl font-bold text-text-dark bg-bg-light-2 border border-border rounded-lg px-3 py-1.5 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30 focus:border-blue-accent transition placeholder:text-text-secondary"
                  placeholder="Nome Completo"
                />
              ) : (
                <h2 className="text-2xl font-bold text-text-dark truncate">{vagoneteiro.name}</h2>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  vagoneteiro.ativo
                    ? "bg-green-timeline/10 text-green-timeline border border-green-timeline/20"
                    : "bg-red/10 text-red border border-red/20"
                }`}>
                  {vagoneteiro.ativo ? "Ativo" : "Inativo"}
                </span>
                <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
                  {vagoneteiro.perfil}
                </span>
              </div>
            </div>
          </div>

          {/* Corpo do perfil */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Coluna 1: Dados pessoais */}
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-text-secondary uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> Dados Pessoais
              </h3>

              <div className="space-y-4">
                {/* CPF (sempre somente leitura) */}
                <div className="flex items-start gap-3">
                  <User size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary">CPF</p>
                    <p className="text-sm font-medium text-text-dark">{formatCpf(vagoneteiro.cpf)}</p>
                  </div>
                </div>

                {/* Telefone */}
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-secondary mb-1">Telefone</p>
                    {editando ? (
                      <input
                        type="tel"
                        value={formTel}
                        onChange={e => setFormTel(e.target.value)}
                        className={inputClass}
                        placeholder="(53) 99999-0000"
                      />
                    ) : (
                      <p className="text-sm font-medium text-text-dark">{formatTel(vagoneteiro.telefone)}</p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-secondary mb-1">E-mail</p>
                    {editando ? (
                      <input
                        type="email"
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        className={inputClass}
                        placeholder="email@exemplo.com"
                      />
                    ) : (
                      <p className="text-sm font-medium text-text-dark">{vagoneteiro.email || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Perfil */}
                <div className="flex items-start gap-3">
                  <UserCheck size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-secondary mb-1">Perfil</p>
                    {editando ? (
                      <select
                        value={formPerfil}
                        onChange={e => setFormPerfil(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        <option value="VAGONETEIRO">Vagoneteiro</option>
                        <option value="REDATOR">Redator</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    ) : (
                      <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold">
                        {vagoneteiro.perfil}
                      </span>
                    )}
                  </div>
                </div>

                {/* Data associação (só leitura) */}
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary">Data de Associação</p>
                    <p className="text-sm font-medium text-text-dark">{formatDataBr(vagoneteiro.data_associacao)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 2: Profissional */}
            <div className="space-y-5">
              <h3 className="font-bold text-sm text-text-secondary uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={14} /> Dados Profissionais
              </h3>

              <div className="space-y-4">
                {/* Experiência */}
                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-secondary mb-1">Experiência</p>
                    {editando ? (
                      <select
                        value={formExperiencia}
                        onChange={e => setFormExperiencia(e.target.value)}
                        className={`${inputClass} cursor-pointer`}
                      >
                        {experienciaOptions.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-medium text-text-dark">
                        {vagoneteiro.experiencia || "Não informado"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Histórico */}
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-text-secondary mb-1">Histórico</p>
                    {editando ? (
                      <textarea
                        value={formHistorico}
                        onChange={e => setFormHistorico(e.target.value)}
                        className={`${inputClass} resize-none`}
                        rows={4}
                      />
                    ) : (
                      <p className="text-sm font-medium text-text-dark">
                        {vagoneteiro.historico || "Não informado"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total passeios (só leitura) */}
                <div className="flex items-start gap-3">
                  <Star size={16} className="text-blue-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-text-secondary">Total de Passeios</p>
                    <p className="text-sm font-medium text-text-dark">
                      {(vagoneteiro.passeios || []).length} passeio{(vagoneteiro.passeios || []).length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Passeios realizados */}
          {(vagoneteiro.passeios || []).length > 0 && (
            <div className="border-t border-border px-8 py-6">
              <h3 className="font-bold text-sm text-text-secondary uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={14} /> Passeios Realizados
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 text-xs font-semibold text-text-secondary uppercase">Data</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-text-secondary uppercase">Valor</th>
                      <th className="pb-2 pr-4 text-xs font-semibold text-text-secondary uppercase">Capacidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vagoneteiro.passeios.map(p => (
                      <tr key={p.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 text-text-dark font-medium">{formatDataBr(p.data)}</td>
                        <td className="py-3 pr-4 text-green-timeline font-bold">R$ {Number(p.preco).toFixed(2).replace('.', ',')}</td>
                        <td className="py-3 pr-4 text-text-primary">{p.capacidade} vagas</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Ações Inferiores */}
        {editando && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-accent hover:bg-blue text-white text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98] shadow-sm"
            >
              {salvando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button
              onClick={cancelarEdicao}
              disabled={salvando}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-border bg-white hover:bg-bg-light-1 text-text-dark text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={16} /> Cancelar
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
