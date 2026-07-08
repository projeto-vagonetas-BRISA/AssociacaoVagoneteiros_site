import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../../contexts/authContext';

interface Passeio {
  id: number; usuarioId: number; valor: string; capacidade: number;
  data: string; usuario: { name: string };
  _count: { agendamentos: number; avaliacoes: number };
}

export const AdminPasseios: React.FC = () => {
  const { token } = useAuth();
  const [passeios, setPasseios] = useState<Passeio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Passeio | null>(null);
  const [form, setForm] = useState({ valor: '', capacidade: '', data: '' });

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/passeios`, { headers });
      const data = await res.json();
      if (res.ok) setPasseios(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const method = editando ? 'PUT' : 'POST';
    const url = editando ? `${API_URL}/passeios/${editando.id}` : `${API_URL}/passeios`;
    const res = await fetch(url, {
      method, headers,
      body: JSON.stringify({
        valor: form.valor,
        capacidade: form.capacidade,
        data: form.data ? new Date(form.data + ':00-03:00').toISOString() : undefined,
      }),
    });
    if (res.ok) { setShowForm(false); setEditando(null); setForm({ valor: '', capacidade: '', data: '' }); carregar(); }
  }

  async function deletar(id: number) {
    if (!confirm('Deletar passeio?')) return;
    await fetch(`${API_URL}/passeios/${id}`, { method: 'DELETE', headers });
    carregar();
  }

  function editar(p: Passeio) {
    const d = new Date(p.data);
    const pad = (n: number) => String(n).padStart(2, '0');
    setForm({
      valor: String(Number(p.valor)),
      capacidade: String(p.capacidade),
      data: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    });
    setEditando(p);
    setShowForm(true);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#181c21]">🚂 Passeios</h1>
        <button onClick={() => { setEditando(null); setForm({ valor: '', capacidade: '', data: '' }); setShowForm(true); }}
          className="btn btn-primary">+ Novo Passeio</button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-4">{editando ? 'Editar' : 'Novo'} Passeio</h2>
          <form onSubmit={salvar} className="form-grid max-w-lg">
            <div>
              <label>Valor (R$)</label>
              <input type="number" step="0.01" min="0.01" required value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div>
              <label>Capacidade (vagas)</label>
              <input type="number" min="1" required value={form.capacidade}
                onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} />
            </div>
            <div className="full">
              <label>Data</label>
              <input type="datetime-local" required value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="form-actions full">
              <button type="button" onClick={() => { setShowForm(false); setEditando(null); }} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary">{editando ? 'Salvar' : 'Criar'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {loading ? <p className="empty">Carregando...</p> : passeios.length === 0 ? <p className="empty">Nenhum passeio</p> : (
        <table>
          <thead><tr><th>#</th><th>Data</th><th>Valor</th><th>Vagas</th><th>Vagoneteiro</th><th>Agend.</th><th>Aval.</th><th>Ações</th></tr></thead>
          <tbody>
            {passeios.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{new Date(p.data).toLocaleString('pt-BR')}</td>
                <td>R$ {Number(p.valor).toFixed(2)}</td>
                <td>{p.capacidade}</td>
                <td>{p.usuario?.name || '-'}</td>
                <td>{p._count.agendamentos}</td>
                <td>{p._count.avaliacoes}</td>
                <td className="flex gap-1">
                  <button onClick={() => editar(p)} className="btn btn-sm btn-primary">Editar</button>
                  <button onClick={() => deletar(p.id)} className="btn btn-sm btn-danger">Deletar</button>
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
