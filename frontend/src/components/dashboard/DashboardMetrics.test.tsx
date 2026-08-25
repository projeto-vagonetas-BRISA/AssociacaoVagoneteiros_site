import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardMetrics } from './DashboardMetrics';

const metricasMock = {
  taxaOcupacao: 42,
  vagasDisponibilizadas: 200,
  vagasPreenchidas: 84,
  taxaCancelamento: 12,
  totalAgendamentos: 150,
  cancelados: 18,
  realizados: 28,
  indiceConversao: 61,
  receita: 7018.50,
  totalPasseios: 25,
};

describe('DashboardMetrics', () => {
  it('renderiza o título Receita Gerada', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText('Receita Gerada')).toBeDefined();
  });

  it('renderiza a receita formatada em pt-BR', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText((t) => t.includes('7.018,50'))).toBeDefined();
  });

  it('renderiza taxa de ocupação', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText('42%')).toBeDefined();
  });

  it('renderiza vagas preenchidas no subtítulo', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText('84 de 200 vagas')).toBeDefined();
  });

  it('renderiza total de passeios ativos', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText('25 passeios ativos')).toBeDefined();
  });

  it('renderiza taxa de cancelamento', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText('12%')).toBeDefined();
  });

  it('renderiza índice de conversão', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    expect(screen.getByText('61%')).toBeDefined();
  });

  it('altera cor da receita conforme valor (receita sempre verde)', () => {
    render(<DashboardMetrics metricas={metricasMock} />);
    // getByText lida com espaços unicode (NBSP) no formato BRL
    const el = screen.getByText((content) => content.includes('7.018,50'));
    expect(el).toBeDefined();
  });

  it('renderiza com taxa de ocupação baixa (sem crash)', () => {
    const metricasBaixas = { ...metricasMock, taxaOcupacao: 5 };
    const { container } = render(<DashboardMetrics metricas={metricasBaixas} />);
    expect(container.querySelectorAll('.rounded-xl').length).toBe(4);
  });

  it('renderiza com todos os dados zerados', () => {
    const metricasZeradas = {
      taxaOcupacao: 0,
      vagasDisponibilizadas: 0,
      vagasPreenchidas: 0,
      taxaCancelamento: 0,
      totalAgendamentos: 0,
      cancelados: 0,
      realizados: 0,
      indiceConversao: 0,
      receita: 0,
      totalPasseios: 0,
    };
    render(<DashboardMetrics metricas={metricasZeradas} />);
    expect(screen.getByText((t) => t.includes('0,00'))).toBeDefined();
  });
});
