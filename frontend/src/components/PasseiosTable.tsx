import React from 'react';
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { formatBRL } from '../utils/format';

interface Passeio {
  id: number;
  preco: number;
  capacidade: number;
  data: string;
  horario: string;
  status?: string;
  usuario: { id: number; name: string };
}

interface PasseiosResponse {
  data: Passeio[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function PasseiosTable({
  passeiosData,
  loadingData,
  paginaPasseio,
  totalPaginasPasseio,
  carregarPasseios,
  onEdit,
  onDelete,
}: {
  passeiosData: PasseiosResponse | null;
  loadingData: boolean;
  paginaPasseio: number;
  totalPaginasPasseio: number;
  carregarPasseios: (p: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const passeios = passeiosData?.data || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-border">
        <div>
          <h2 className="font-bold text-lg text-text-dark">Gestão de Passeios Disponíveis</h2>
          <p className="text-sm text-[#7a8394] mt-0.5">Gerencie os horários e vagas disponíveis</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-bg-light-2">
              {['Data / Hora', 'Horário', 'Valor', 'Capacidade', 'Vagoneteiro', 'Ações'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-[#7a8394] tracking-widest uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingData ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#7a8394]">Carregando...</td></tr>
            ) : passeios.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#7a8394]">Nenhum passeio cadastrado</td></tr>
            ) : passeios.map((p) => (
              <tr key={p.id} className={`border-b border-border last:border-0 transition-colors ${
                p.status === 'REALIZADO' ? 'bg-green-timeline/5 hover:bg-green-timeline/10' :
                p.status === 'CANCELADO' ? 'bg-red-dark/5 hover:bg-red-dark/10' :
                'hover:bg-bg-light-2'
              }`}>
                <td className="px-6 py-4 text-sm font-medium text-text-dark whitespace-nowrap">{new Date(p.data.split('T')[0]+'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block bg-blue-accent/10 text-blue-accent border border-blue-accent/20 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      {p.horario}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-green-timeline">{formatBRL(Number(p.preco))}</td>
                <td className="px-6 py-4 text-sm text-text-primary">
                  <span className="font-bold">{String(p.capacidade).padStart(2, '0')}</span>
                  <span className="text-[#7a8394]"> vagas</span>
                </td>
                <td className="px-6 py-4 text-sm text-text-primary">{p.usuario?.name || '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onEdit(p.id)} className="text-[#7a8394] hover:text-blue-accent"><Pencil size={15} /></button>
                    <button onClick={() => onDelete(p.id)} className="text-[#7a8394] hover:text-red-dark"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <p className="text-xs text-[#7a8394]">
          Página {paginaPasseio} de {totalPaginasPasseio} — {passeiosData?.total || 0} passeio{(passeiosData?.total || 0) !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => carregarPasseios(Math.max(1, paginaPasseio - 1))}
            disabled={paginaPasseio === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => carregarPasseios(Math.min(totalPaginasPasseio, paginaPasseio + 1))}
            disabled={paginaPasseio === totalPaginasPasseio}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-[#7a8394] hover:bg-bg-light-1 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
