import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  porDiaSemana?: { dia: string; total: number }[];
  porHorario?: { horario: string; total: number }[];
}

type Aba = 'dia' | 'horario';

export const PicosDemandaChart: React.FC<Props> = ({ porDiaSemana = [], porHorario = [] }) => {
  const [aba, setAba] = useState<Aba>('dia');

  const dados = aba === 'dia' ? porDiaSemana : porHorario;
  const label = aba === 'dia' ? 'Passageiros por Dia da Semana' : 'Passageiros por Horário';

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-dark">Picos de Demanda</h3>
        <div className="flex gap-1">
          <button
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${aba === 'dia' ? 'bg-blue-accent text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
            onClick={() => setAba('dia')}>Dia Semana</button>
          <button
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${aba === 'horario' ? 'bg-blue-accent text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
            onClick={() => setAba('horario')}>Horário</button>
        </div>
      </div>

      {dados.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-8">Nenhum dado no período</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={aba === 'dia' ? 'dia' : 'horario'}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
              formatter={(value: number) => [`${value} passageiros`, 'Total']}
            />
            <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
