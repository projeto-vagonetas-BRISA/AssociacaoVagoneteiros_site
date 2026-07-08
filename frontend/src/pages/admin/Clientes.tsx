import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../../contexts/authContext';

interface Cliente {
  id: number; nome: string; cpf: string; telefone: string; email: string | null;
}

export const AdminClientes: React.FC = () => {
  const { token } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function carregar() {
    setLoading(true);
    const res = await fetch(`${API_URL}/clientes`, { headers });
    if (res.ok) setClientes(await res.json());
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function deletar(id: number) {
    if (!confirm('Deletar cliente?')) return;
    await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE', headers });
    carregar();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#181c21] mb-6">👤 Clientes</h1>
      <div className="card">
        {loading ? <p className="empty">Carregando...</p> : clientes.length === 0 ? <p className="empty">Nenhum cliente</p> : (
        <table>
          <thead><tr><th>#</th><th>CPF</th><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead>
          <tbody>
            {clientes.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td><td className="font-mono">{c.cpf}</td>
                <td>{c.nome}</td><td>{c.telefone}</td><td>{c.email || '-'}</td>
                <td><button onClick={() => deletar(c.id)} className="btn btn-sm btn-danger">Deletar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};
