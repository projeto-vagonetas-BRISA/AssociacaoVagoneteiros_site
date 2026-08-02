import React, { useEffect } from "react";
import { Users, Building2 } from "lucide-react";
import { useNameField, useCpfField, useCnpjField, useTelField, useEmailField } from "../utils/formValidations";

interface Props {
  nome: string;
  telefone: string;
  documento: string;
  setNome: React.Dispatch<React.SetStateAction<string>>;
  setTelefone: React.Dispatch<React.SetStateAction<string>>;
  setDocumento: React.Dispatch<React.SetStateAction<string>>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  isAgencia: boolean;
  consentimento: boolean;
  setConsentimento: React.Dispatch<React.SetStateAction<boolean>>;
  consentimentoNotificacao: boolean;
  setConsentimentoNotificacao: React.Dispatch<React.SetStateAction<boolean>>;
}

const SectionIcon: React.FC<{ icon: React.ReactNode }> = ({ icon }) => (
  <div className="w-8 h-8 rounded-md bg-blue-accent/10 flex items-center justify-center text-blue-accent shrink-0">
    {icon}
  </div>
);

export const InformacoesPessoais: React.FC<Props> = ({
  nome,
  telefone,
  setNome,
  setTelefone,
  email,
  setEmail,
  documento,
  setDocumento,
  isAgencia,
  consentimento,
  setConsentimento,
  consentimentoNotificacao,
  setConsentimentoNotificacao,
  
}) => {
  const {
    name,
    nameError,
    setName,
    handleNameChange,
  } = useNameField();

  const {
    cpf,
    cpfError,
    setCpf,
    handleCpfChange,
  } = useCpfField();

  const {
    cnpj,
    cnpjError,
    setCnpj,
    handleCnpjChange,
  } = useCnpjField();

  const {
    tel,
    telError,
    setTel,
    handleTelChange,
  } = useTelField();

  const {
    email: emailValue,
    emailError,
    setEmail: setEmailField,
    handleEmailChange,
  } = useEmailField();

  useEffect(() => {
    if (nome !== name) setName(nome);
  }, [nome, name, setName]);

  useEffect(() => {
    if (isAgencia) {
      if (documento !== cnpj) setCnpj(documento);
    } else {
      if (documento !== cpf) setCpf(documento);
    }
  }, [isAgencia, documento, cpf, cnpj, setCpf, setCnpj]);

  useEffect(() => {
    if (telefone !== tel) setTel(telefone);
  }, [telefone, tel, setTel]);

  useEffect(() => {
    if (email !== emailValue) setEmailField(email);
  }, [email, emailValue, setEmailField]);

  const inputClass =
    "border border-border rounded-lg px-3 py-2 text-sm text-text-dark bg-bg-light-2 focus:outline-none focus:border-blue-accent transition-colors placeholder:text-[#c4c8d4]";

  const labelClass = "font-medium text-xs text-text-secondary";

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-4">
        <SectionIcon
          icon={
            isAgencia ? (
              <Building2 className="size-4" strokeWidth={2} />
            ) : (
              <Users className="size-4" strokeWidth={2} />
            )
          }
        />
        <h2 className="font-semibold text-base text-text-dark">
          {isAgencia ? "Dados da Agência" : "Informações Pessoais"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isAgencia ? (
          <>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>CNPJ:</label>
              <input
                value={cnpj}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                onChange={(e) => {
                  const formattedCnpj = handleCnpjChange(e);
                  setDocumento(formattedCnpj);

                  const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                  if (digits.length === 14) {
                    import('../services/api').then(({ api }) => {
                      api.request(`/clientes/busca/${digits}`)
                        .then((cliente: any) => {
                          if (cliente) {
                            setNome(cliente.nome || '');
                            setTelefone(cliente.telefone || '');
                            setEmail(cliente.email || '');
                          }
                        })
                        .catch(() => {});
                    });
                  }
                }}
                className={inputClass}
              />
              {cnpjError && <p className="mt-1 text-xs text-red-500">{cnpjError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Nome da Agência:</label>
              <input
                value={name}
                placeholder="Razão social ou nome fantasia"
                onChange={(e) => {
                  const formattedName = handleNameChange(e);
                  setNome(formattedName);
                }}
                className={inputClass}
              />
              {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Telefone:</label>
              <input
                value={tel}
                placeholder="(xx) 9xxxx-xxxx"
                maxLength={15}
                onChange={(e) => {
                  const formattedTel = handleTelChange(e);
                  setTelefone(formattedTel);
                }}
                className={inputClass}
              />
              {telError && <p className="mt-1 text-xs text-red-500">{telError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>E-mail:</label>
              <input
                value={emailValue}
                placeholder="agencia@exemplo.com"
                onChange={(e) => {
                  const formattedEmail = handleEmailChange(e);
                  setEmail(formattedEmail);
                }}
                className={inputClass}
              />
              {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>CPF:</label>
              <input
                value={cpf}
                placeholder="000.000.000-00"
                maxLength={14}
                onChange={(e) => {
                  const formattedCpf = handleCpfChange(e);
                  setDocumento(formattedCpf);
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                  if (digits.length === 11) {
                    import('../services/api').then(({ api }) => {
                      api.request(`/clientes/busca/${digits}`)
                        .then((cliente: any) => {
                          if (cliente) {
                            setNome(cliente.nome || '');
                            setTelefone(cliente.telefone || '');
                            setEmail(cliente.email || '');
                          }
                        })
                        .catch(() => {});
                    });
                  }
                }}
                className={inputClass}
              />
              {cpfError && <p className="mt-1 text-xs text-red-500">{cpfError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Nome:</label>
              <input
                value={name}
                placeholder="Seu nome completo"
                onChange={(e) => {
                  const formattedName = handleNameChange(e);
                  setNome(formattedName);
                }}
                className={inputClass}
              />
              {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Telefone:</label>
              <input
                value={tel}
                placeholder="(xx) 9xxxx-xxxx"
                maxLength={15}
                onChange={(e) => {
                  const formattedTel = handleTelChange(e);
                  setTelefone(formattedTel);
                }}
                className={inputClass}
              />
              {telError && <p className="mt-1 text-xs text-red-500">{telError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Email:</label>
              <input
                value={emailValue}
                placeholder="seu.email@exemplo.com"
                onChange={(e) => {
                  const formattedEmail = handleEmailChange(e);
                  setEmail(formattedEmail);
                }}
                className={inputClass}
              />
              {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
            </div>
          </>
        )}
      </div>
      {/* consentimento LGPD */}
      <div className="flex items-start gap-3 mt-4 pt-4 border-t border-border">
        <input
          type="checkbox"
          id="consentimento"
          checked={consentimento}
          onChange={(e) => setConsentimento(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-border accent-blue-accent cursor-pointer shrink-0"
        />
        <label htmlFor="consentimento" className="text-xs text-text-secondary leading-relaxed cursor-pointer">
          Os dados coletados aqui serão usados para processar seu passeio e, caso você autorize, 
          para o envio de novidades e promoções da Associação via{" "}
          <span className="font-semibold text-text-dark">E-mail</span>.
        </label>
      </div>
      {/* consentimento notificações */}
      <div className="flex items-start gap-3 mt-4 pt-4 border-t border-border">
        <input
          type="checkbox"
          id="consentimentoNotificacao"
          checked={consentimentoNotificacao}
          onChange={(e) => setConsentimentoNotificacao(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-border accent-blue-accent cursor-pointer shrink-0"
        />
        <label htmlFor="consentimentoNotificacao" className="text-xs text-text-secondary leading-relaxed cursor-pointer">
          Autoriza o envio de notificações sobre o status do seu passeio e outras informações relevantes.
        </label>
      </div>
    </div>
  );
};