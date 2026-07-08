import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../../contexts/authContext';

interface Agendamento {
  id: number; clienteId: number; passeioId: number; status: string;
  cliente: { nome: string }; passeio: { data: string; valor: string };
}

export const AdminAgendamentos: React.FC = () => {
  const { token } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function carregar() {
    setLoading(true);
    const res = await fetch(`${API_URL}/agendamentos`, { headers });
    if (res.ok) setAgendamentos(await res.json());
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function alterarStatus(id: number, status: string) {
    await fetch(`${API_URL}/agendamentos/${id}/status`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    carregar();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#181c21] mb-6">📅 Agendamentos</h1>
      <div className="card">
        {loading ? <p className="empty">Carregando...</p> : agendamentos.length === 0 ? <p className="empty">Nenhum agendamento</p> : (
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Passeio</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {agendamentos.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.cliente?.nome || '-'}</td>
                <td>{a.passeio ? new Date(a.passeio.data).toLocaleString('pt-BR') : '-'}</td>
                <td>{a.passeio ? `R$ ${Number(a.passeio.valor).toFixed(2)}` : '-'}</td>
                <td><span className={`badge-status badge-${a.status}`}>{a.status}</span></td>
                <td>
                  <select
                    value={a.status}
                    onChange={e => alterarStatus(a.id, e.target.value)}
                    className="text-xs p-1 border rounded"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="CONFIRMADO">Confirmado</option>
                    <option value="CANCELADO">Cancelado</option>
                    <option value="REMARCADO">Remarcado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};
