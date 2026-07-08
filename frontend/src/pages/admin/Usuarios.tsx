import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../../contexts/authContext';

interface Usuario {
  id: number; name: string; cpf: string; email: string | null;
  perfil: string; data_associacao: string;
}

export const AdminUsuarios: React.FC = () => {
  const { token, user, updateUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function carregar() {
    setLoading(true);
    const res = await fetch(`${API_URL}/usuarios`, { headers });
    if (res.ok) setUsuarios(await res.json());
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  async function alterarPerfil(id: number, perfil: string) {
    const res = await fetch(`${API_URL}/usuarios/${id}/perfil`, {
      method: 'PATCH', headers, body: JSON.stringify({ perfil }),
    });
    if (res.ok) {
      // Se alterou o próprio perfil, atualizar contexto
      if (id === user?.id && updateUser) {
        updateUser({ ...user, perfil: perfil as any });
      }
      carregar();
    }
  }

  async function deletar(id: number) {
    if (!confirm('Deletar usuário permanentemente?')) return;
    await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE', headers });
    carregar();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#181c21] mb-6">🔐 Usuários</h1>
      <p className="text-sm text-[#888] mb-4">Apenas ADMIN pode gerenciar perfis.</p>
      <div className="card">
        {loading ? <p className="empty">Carregando...</p> : usuarios.length === 0 ? <p className="empty">Nenhum usuário</p> : (
        <table>
          <thead><tr><th>#</th><th>Nome</th><th>CPF</th><th>E-mail</th><th>Perfil</th><th>Ações</th></tr></thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td className="font-mono">{u.cpf}</td>
                <td>{u.email || '-'}</td>
                <td><span className={`badge-status badge-${u.perfil}`}>{u.perfil}</span></td>
                <td className="flex gap-1">
                  <select
                    value={u.perfil}
                    onChange={e => alterarPerfil(u.id, e.target.value)}
                    className="text-xs p-1 border rounded"
                  >
                    <option value="USUARIO">USUARIO</option>
                    <option value="REDATOR">REDATOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                  {u.id !== user?.id && (
                    <button onClick={() => deletar(u.id)} className="btn btn-sm btn-danger">Deletar</button>
                  )}
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
