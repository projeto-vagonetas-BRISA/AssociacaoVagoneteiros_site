import React, { useState } from 'react';
import type { PeriodoPreset } from './types';

interface Props {
  onChange: (inicio: string, fim: string, preset: PeriodoPreset) => void;
}

export const FiltrosPeriodo: React.FC<Props> = ({ onChange }) => {
  const [preset, setPreset] = useState<PeriodoPreset>('mes');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const hoje = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  function aplicar(p: PeriodoPreset, inicio?: string, fim?: string) {
    setPreset(p);
    let i: string, f: string;

    switch (p) {
      case 'hoje':
        i = fmt(hoje);
        f = fmt(hoje);
        break;
      case 'semana': {
        const d = new Date(hoje);
        d.setDate(d.getDate() - d.getDay()); // domingo
        i = fmt(d);
        f = fmt(hoje);
        break;
      }
      case 'mes':
        i = fmt(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
        f = fmt(hoje);
        break;
      case 'personalizado':
        i = inicio || dataInicio;
        f = fim || dataFim;
        setDataInicio(i);
        setDataFim(f);
        break;
    }
    onChange(i, f, p);
  }

  // Inicializa com o mês atual
  React.useEffect(() => {
    aplicar('mes');
  }, []);

  const baseBtn = 'px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer';
  const activeBtn = 'bg-blue-accent text-white';
  const inactiveBtn = 'bg-white border border-border text-text-dark hover:bg-bg-light-1';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={`${baseBtn} ${preset === 'hoje' ? activeBtn : inactiveBtn}`} onClick={() => aplicar('hoje')}>Hoje</button>
      <button className={`${baseBtn} ${preset === 'semana' ? activeBtn : inactiveBtn}`} onClick={() => aplicar('semana')}>Esta Semana</button>
      <button className={`${baseBtn} ${preset === 'mes' ? activeBtn : inactiveBtn}`} onClick={() => aplicar('mes')}>Este Mês</button>

      {preset === 'personalizado' && (
        <div className="flex items-center gap-2">
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
            className="h-9 px-3 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent" />
          <span className="text-text-secondary text-sm">até</span>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
            className="h-9 px-3 border border-border rounded-lg text-sm text-text-dark outline-none focus:border-blue-accent" />
          <button className={`${baseBtn} bg-blue-accent text-white hover:bg-blue`}
            onClick={() => aplicar('personalizado', dataInicio, dataFim)}>Filtrar</button>
        </div>
      )}
      {preset !== 'personalizado' && (
        <button className={`${baseBtn} ${inactiveBtn}`} onClick={() => { setPreset('personalizado'); setDataInicio(fmt(hoje)); setDataFim(fmt(hoje)); }}>
          Personalizado
        </button>
      )}
    </div>
  );
};
