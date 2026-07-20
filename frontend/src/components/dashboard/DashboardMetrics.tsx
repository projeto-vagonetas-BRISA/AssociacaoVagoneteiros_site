import React from 'react';

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
      cor: metricas.taxaOcupacao > 60 ? 'text-green-600' : metricas.taxaOcupacao > 30 ? 'text-yellow-600' : 'text-red-600',
      bg: metricas.taxaOcupacao > 60 ? 'bg-green-50 border-green-200' : metricas.taxaOcupacao > 30 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200',
    },
    {
      titulo: 'Receita Gerada',
      valor: `R$ ${metricas.receita.toFixed(2)}`,
      sub: `${metricas.totalPasseios} passeios ativos`,
      cor: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
    },
    {
      titulo: 'Taxa de Cancelamento',
      valor: `${metricas.taxaCancelamento}%`,
      sub: `${metricas.cancelados} cancelados / ${metricas.totalAgendamentos} total`,
      cor: metricas.taxaCancelamento > 20 ? 'text-red-600' : 'text-yellow-600',
      bg: metricas.taxaCancelamento > 20 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200',
    },
    {
      titulo: 'Índice de Conversão',
      valor: `${metricas.indiceConversao}%`,
      sub: `${metricas.realizados} realizados / ${metricas.realizados + metricas.cancelados} finalizados`,
      cor: metricas.indiceConversao > 60 ? 'text-green-600' : 'text-yellow-600',
      bg: metricas.indiceConversao > 60 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => (
        <div key={i} className={`rounded-xl border-2 ${card.bg} p-5 flex flex-col gap-1`}>
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{card.titulo}</span>
          <span className={`text-2xl font-bold ${card.cor}`}>{card.valor}</span>
          <span className="text-xs text-text-secondary">{card.sub}</span>
        </div>
      ))}
    </div>
  );
};
