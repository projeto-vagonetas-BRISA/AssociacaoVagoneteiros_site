import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePasswordField } from '../utils/formValidations';

export function RedefinirSenha() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const passwordField = usePasswordField();
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      setErro('Link inválido. Token de redefinição não encontrado.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMensagem(null);

    if (!token) { setErro('Token inválido.'); return; }

    const validationErr = passwordField.validatePassword(passwordField.password);
    if (validationErr) {
      passwordField.setPasswordError(validationErr);
      setErro(validationErr);
      return;
    }

    if (passwordField.password !== passwordField.confirmPassword) {
      passwordField.setConfirmPasswordError('As senhas não coincidem.');
      setErro('As senhas não conferem.');
      return;
    }

    setEnviando(true);
    try {
      const res = await api.request<{ message: string }>('/auth/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha: passwordField.password }),
      });
      setSucesso(true);
      setMensagem(res.message);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao redefinir senha. O token pode ter expirado.');
    }
    setEnviando(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light-3 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Link Inválido</h1>
          <p className="text-text-secondary mb-6">{erro}</p>
          <Link to="/" className="text-blue-accent font-semibold hover:underline">Voltar para Home</Link>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light-3 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Senha Redefinida!</h1>
          <p className="text-text-secondary mb-2">{mensagem}</p>
          <p className="text-sm text-text-secondary">Redirecionando para Home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light-3 px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-dark">Redefinir Senha</h1>
          <p className="text-sm text-text-secondary mt-1">Escolha uma nova senha para sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1">Nova senha</label>
            <input
              type="password"
              value={passwordField.password}
              onChange={passwordField.handlePasswordChange}
              className={`w-full px-3 py-2.5 border ${passwordField.passwordError ? 'border-red-400 focus:ring-red-400/20' : 'border-border'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30`}
              autoFocus
            />
            {passwordField.passwordError && (
              <p className="mt-1 text-xs text-red-500">{passwordField.passwordError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-dark mb-1">Confirmar senha</label>
            <input
              type="password"
              value={passwordField.confirmPassword}
              onChange={passwordField.handleConfirmPasswordChange}
              placeholder="Digite a senha novamente"
              className={`w-full px-3 py-2.5 border ${passwordField.confirmPasswordError ? 'border-red-400 focus:ring-red-400/20' : 'border-border'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent/30`}
            />
            {passwordField.confirmPasswordError && (
              <p className="mt-1 text-xs text-red-500">{passwordField.confirmPasswordError}</p>
            )}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{erro}</p>
            </div>
          )}
          {mensagem && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <p className="text-sm text-green-600">{mensagem}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-2.5 rounded-lg bg-blue-accent text-white font-semibold text-sm hover:bg-blue-dark transition-colors disabled:opacity-60 cursor-pointer"
          >
            {enviando ? 'Redefinindo...' : 'Redefinir Senha'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-blue-accent hover:underline">Voltar para Home</Link>
        </div>
      </div>
    </div>
  );
}
