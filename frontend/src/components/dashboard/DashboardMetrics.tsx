import React from 'react';
import { TrendingUp, TrendingDown, LayoutGrid, Percent } from 'lucide-react';

interface Metricas {
  taxaOcupacao: number;
  vagasDisponibilizadas: number;
  vagasPreenchidas: number;
  taxaCancelamento: number;
  totalAgendamentos: number;
  cancelados: number;
  realizados: number;
  indiceConversao: number;
  receita: number;
  totalPasseios: number;
}

interface Props {
  metricas: Metricas;
}

export const DashboardMetrics: React.FC<Props> = ({ metricas }) => {
  const cards = [
    {
      titulo: 'Taxa de Ocupação',
      valor: `${metricas.taxaOcupacao}%`,
      sub: `${metricas.vagasPreenchidas} de ${metricas.vagasDisponibilizadas} vagas`,
      icon: LayoutGrid,
      cor: metricas.taxaOcupacao > 60 ? 'text-green-timeline' : metricas.taxaOcupacao > 30 ? 'text-amber-500' : 'text-red',
      iconBg: metricas.taxaOcupacao > 60 ? 'bg-green-timeline/10' : metricas.taxaOcupacao > 30 ? 'bg-amber-500/10' : 'bg-red/10',
    },
    {
      titulo: 'Receita Gerada',
      valor: `R$ ${metricas.receita.toFixed(2)}`,
      sub: `${metricas.totalPasseios} passeios ativos`,
      icon: TrendingUp,
      cor: 'text-green-timeline',
      iconBg: 'bg-green-timeline/10',
    },
    {
      titulo: 'Taxa de Cancelamento',
      valor: `${metricas.taxaCancelamento}%`,
      sub: `${metricas.cancelados} cancelados / ${metricas.totalAgendamentos} total`,
      icon: TrendingDown,
      cor: metricas.taxaCancelamento > 20 ? 'text-red' : 'text-amber-500',
      iconBg: metricas.taxaCancelamento > 20 ? 'bg-red/10' : 'bg-amber-500/10',
    },
    {
      titulo: 'Índice de Conversão',
      valor: `${metricas.indiceConversao}%`,
      sub: `${metricas.realizados} realizados / ${metricas.realizados + metricas.cancelados} finalizados`,
      icon: Percent,
      cor: metricas.indiceConversao > 60 ? 'text-blue-accent' : 'text-amber-500',
      iconBg: metricas.indiceConversao > 60 ? 'bg-blue-accent/10' : 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{card.titulo}</span>
              <div className={`w-8 h-8 rounded-md ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`size-4 ${card.cor}`} strokeWidth={2} />
              </div>
            </div>
            <span className={`text-2xl font-bold tracking-tight ${card.cor}`}>{card.valor}</span>
            <span className="text-xs text-text-secondary">{card.sub}</span>
          </div>
        );
      })}
    </div>
  );
};
