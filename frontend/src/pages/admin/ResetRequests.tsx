import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, XCircle, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/auth';
import type { ResetRequest } from '../../services/auth';

export const ResetRequests: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const solicitacoes = await authService.listResetRequests();
      setRequests(solicitacoes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id: number) => {
    if (!window.confirm('Aprovar esta solicitação de redefinição de senha?')) return;
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      const result = await authService.approveResetRequest(id);
      setMessage(result.message);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar solicitação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Rejeitar esta solicitação de redefinição de senha?')) return;
    setActionLoading(id);
    setError('');
    setMessage('');
    try {
      const result = await authService.rejectResetRequest(id);
      setMessage(result.message);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar solicitação');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg-light-1 flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-10 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/painel-admin')}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white border border-border text-text-dark hover:bg-bg-light-1 transition-colors"
            aria-label="Voltar ao painel"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-lg bg-blue-accent/10 flex items-center justify-center text-blue-accent">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="font-bold text-2xl text-text-dark">Solicitações de Redefinição de Senha</h1>
            <p className="text-sm text-text-secondary">Aprovação administrativa para contas ADMIN/REDATOR.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {error && (
            <div className="rounded-xl border border-red-dark/20 bg-red-dark/5 px-4 py-3 text-sm text-red-dark">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-green-timeline/20 bg-green-timeline/5 px-4 py-3 text-sm text-green-timeline">
              {message}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border bg-bg-light-2">
            <p className="text-sm font-semibold text-text-dark">Solicitações pendentes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="bg-bg-light-1 text-left text-xs uppercase tracking-[0.24em] text-text-secondary">
                  {['ID', 'E-mail', 'Perfil', 'Vagoneteiro', 'Criado em', 'Ações'].map((label) => (
                    <th key={label} className="px-6 py-4 border-b border-border">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-text-secondary">
                      Carregando solicitações...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-text-secondary">
                      Não há solicitações pendentes no momento.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="border-b border-border last:border-0 hover:bg-bg-light-2">
                      <td className="px-6 py-4 font-medium text-text-dark">#{request.id}</td>
                      <td className="px-6 py-4 text-text-primary">{request.email}</td>
                      <td className="px-6 py-4 text-text-primary">{request.perfil}</td>
                      <td className="px-6 py-4 text-text-primary">
                        {request.usuario?.name ?? 'Sem usuário vinculado'}
                      </td>
                      <td className="px-6 py-4 text-text-primary">{new Date(request.criadoEm).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-timeline/10 text-green-timeline border border-green-timeline/20 hover:bg-green-timeline/15 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-dark/10 text-red-dark border border-red-dark/20 hover:bg-red-dark/15 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Rejeitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
