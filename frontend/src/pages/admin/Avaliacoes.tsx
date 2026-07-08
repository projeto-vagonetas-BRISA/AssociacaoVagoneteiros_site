import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../../contexts/authContext';

interface Avaliacao {
  id: number; nota: number; comentario: string;
  cliente: { nome: string }; passeio: { data: string };
}

export const AdminAvaliacoes: React.FC = () => {
  const { token } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function carregar() {
    setLoading(true);
    const res = await fetch(`${API_URL}/avaliacoes`, { headers });
    if (res.ok) setAvaliacoes(await res.json());
    setLoading(false);
  }
  useEffect(() => { carregar(); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#181c21] mb-6">⭐ Avaliações</h1>
      <div className="card">
        {loading ? <p className="empty">Carregando...</p> : avaliacoes.length === 0 ? <p className="empty">Nenhuma avaliação</p> : (
        <table>
          <thead><tr><th>#</th><th>Cliente</th><th>Passeio</th><th>Nota</th><th>Comentário</th></tr></thead>
          <tbody>
            {avaliacoes.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.cliente?.nome || '-'}</td>
                <td>{a.passeio ? new Date(a.passeio.data).toLocaleString('pt-BR') : '-'}</td>
                <td>{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</td>
                <td className="truncate max-w-xs">{a.comentario || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
};
