import React, { useState, useCallback } from 'react';
import api from '../../services/api';
import { PeriodoPreset, FiltrosPeriodo } from './FiltrosPeriodo';
import { DashboardMetrics } from './DashboardMetrics';
import { PicosDemandaChart } from './PicosDemandaChart';
import { RelatorioFaturamento } from './RelatorioFaturamento';

export const DashboardProvider: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [metricas, setMetricas] = useState<any>(null);
  const [picos, setPicos] = useState<{ porDiaSemana: any[]; porHorario: any[] }>({ porDiaSemana: [], porHorario: [] });
  const [faturamento, setFaturamento] = useState<{ vagoneteiros: any[]; totalGeral: number; periodo: any }>({ vagoneteiros: [], totalGeral: 0, periodo: { inicio: '', fim: '' } });
  const [periodo, setPeriodo] = useState<{ inicio: string; fim: string }>({ inicio: '', fim: '' });

  const carregar = useCallback(async (inicio: string, fim: string, _preset: PeriodoPreset) => {
    setLoading(true);
    setPeriodo({ inicio, fim });
    try {
      const [resMetricas, resPicos, resFaturamento] = await Promise.all([
        api.request<any>(`/dashboard/metricas?inicio=${inicio}&fim=${fim}`),
        api.request<any>(`/dashboard/picos?inicio=${inicio}&fim=${fim}`),
        api.request<any>(`/dashboard/faturamento?inicio=${inicio}&fim=${fim}`),
      ]);
      setMetricas(resMetricas.metricas);
      setPicos(resPicos.picos);
      setFaturamento(resFaturamento);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <FiltrosPeriodo onChange={carregar} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-accent" />
        </div>
      ) : metricas ? (
        <>
          <DashboardMetrics metricas={metricas} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PicosDemandaChart
              porDiaSemana={picos.porDiaSemana}
              porHorario={picos.porHorario}
            />
            {/* Card extra de resumo pode ir aqui */}
            <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
              <h3 className="font-semibold text-text-dark">Resumo do Período</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-text-secondary text-xs">Passeios Ativos</span>
                  <span className="font-semibold text-text-dark">{metricas.totalPasseios}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-secondary text-xs">Agendamentos</span>
                  <span className="font-semibold text-text-dark">{metricas.totalAgendamentos}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-secondary text-xs">Realizados</span>
                  <span className="font-semibold text-green-600">{metricas.realizados}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-secondary text-xs">Cancelados</span>
                  <span className="font-semibold text-red-600">{metricas.cancelados}</span>
                </div>
              </div>
            </div>
          </div>

          <RelatorioFaturamento
            vagoneteiros={faturamento.vagoneteiros}
            totalGeral={faturamento.totalGeral}
            periodo={periodo}
          />
        </>
      ) : (
        <div className="text-center py-20 text-text-secondary">
          Selecione um período para carregar o dashboard
        </div>
      )}
    </div>
  );
};
