import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, API_URL } from '../contexts/authContext';

export const Entrar: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [senha, setSenha] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Helper para formatar CPF dinamicamente se o usuário digitar apenas números
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Se o valor contiver apenas números (ou formatação parcial de CPF), formata
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length > 0 && !val.includes('@') && digitsOnly.length <= 11) {
      let formatted = digitsOnly;
      if (digitsOnly.length > 9) {
        formatted = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6, 9)}-${digitsOnly.slice(9)}`;
      } else if (digitsOnly.length > 6) {
        formatted = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3, 6)}.${digitsOnly.slice(6)}`;
      } else if (digitsOnly.length > 3) {
        formatted = `${digitsOnly.slice(0, 3)}.${digitsOnly.slice(3)}`;
      }
      setIdentifier(formatted);
    } else {
      setIdentifier(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier) {
      setErrorMsg('Por favor, informe seu CPF ou E-mail');
      return;
    }

    if (!senha) {
      setErrorMsg('Por favor, digite sua senha');
      return;
    }

    setLoadingForm(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier,
          senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao realizar login');
      }

      // Salvar sessão e redirecionar
      login(data.token, data.user);

      if (data.user.perfil === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível conectar ao servidor');
    } finally {
      setLoadingForm(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#061224] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#1878c1]/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#b61722]/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0d2340]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white tracking-tight">Área do Associado</h2>
          <p className="text-white/60 text-sm mt-2">
            Acesse o sistema dos vagoneteiros para agendamento e gerenciamento.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-[#b61722]/15 border border-[#b61722]/30 text-red-200 rounded-lg text-sm flex items-start gap-3 animate-shake">
            <svg className="w-5 h-5 shrink-0 text-[#b61722]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="identifier" className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              CPF ou E-mail
            </label>
            <input
              id="identifier"
              type="text"
              placeholder="Digite seu CPF ou e-mail"
              value={identifier}
              onChange={handleIdentifierChange}
              disabled={loadingForm}
              className="w-full h-11 bg-black/20 border border-white/10 rounded-lg px-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#1878c1] focus:ring-1 focus:ring-[#1878c1] transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="senha" className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                Senha
              </label>
            </div>
            <input
              id="senha"
              type="password"
              placeholder="Sua senha secreta"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={loadingForm}
              className="w-full h-11 bg-black/20 border border-white/10 rounded-lg px-4 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#1878c1] focus:ring-1 focus:ring-[#1878c1] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loadingForm}
            className="w-full h-11 rounded-lg bg-[#b61722] hover:bg-[#9e1320] text-white text-sm font-semibold tracking-wide shadow-lg hover:shadow-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-55 disabled:pointer-events-none"
          >
            {loadingForm ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-white/50 text-sm">
            Ainda não é associado?{' '}
            <Link to="/cadastro" className="text-[#1878c1] hover:text-[#2d91dd] font-medium transition-colors">
              Cadastre-se aqui
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
};
