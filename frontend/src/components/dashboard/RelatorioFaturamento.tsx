import React, { useState } from 'react';

interface PasseioItem {
  titulo: string;
  data: string;
  valor: number;
}

interface VagoneteiroFaturamento {
  id: number;
  nome: string;
  passeios: PasseioItem[];
  total: number;
}

interface Props {
  vagoneteiros: VagoneteiroFaturamento[];
  totalGeral: number;
  periodo: { inicio: string; fim: string };
}

type OrdenarPor = 'nome' | 'total' | 'qtd';

export const RelatorioFaturamento: React.FC<Props> = ({ vagoneteiros, totalGeral, periodo }) => {
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('total');
  const [ordemCrescente, setOrdemCrescente] = useState(false);

  function toggleOrdenacao(col: OrdenarPor) {
    if (ordenarPor === col) {
      setOrdemCrescente(!ordemCrescente);
    } else {
      setOrdenarPor(col);
      setOrdemCrescente(col === 'nome');
    }
  }

  const ordenados = [...vagoneteiros].sort((a, b) => {
    let cmp = 0;
    if (ordenarPor === 'nome') cmp = a.nome.localeCompare(b.nome);
    else if (ordenarPor === 'total') cmp = a.total - b.total;
    else if (ordenarPor === 'qtd') cmp = a.passeios.length - b.passeios.length;
    return ordemCrescente ? cmp : -cmp;
  });

  const seta = (col: OrdenarPor) => {
    if (ordenarPor !== col) return '';
    return ordemCrescente ? ' ▲' : ' ▼';
  };

  async function gerarPDF() {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título
    doc.setFontSize(16);
    doc.text('Relatório de Faturamento - Vagoneteiros', pageWidth / 2, 15, { align: 'center' });

    // Período
    doc.setFontSize(10);
    doc.text(`Período: ${periodo.inicio.slice(0, 10)} a ${periodo.fim.slice(0, 10)}`, pageWidth / 2, 22, { align: 'center' });

    // Cabeçalho da tabela
    const headers = ['Vagoneteiro', 'Qtd Passeios', 'Valor Arrecadado'];
    const colW = [90, 50, 50];
    let y = 32;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    let x = 14;
    headers.forEach((h, i) => {
      doc.text(h, x + colW[i] / 2, y, { align: 'center' });
      x += colW[i];
    });

    // Linha separadora
    y += 3;
    doc.line(14, y, 14 + colW.reduce((a, b) => a + b, 0), y);
    y += 4;

    // Dados
    doc.setFont('helvetica', 'normal');
    ordenados.forEach((v) => {
      if (y > 185) {
        doc.addPage();
        y = 20;
      }
      x = 14;
      doc.text(v.nome, x + 2, y);
      x += colW[0];
      doc.text(String(v.passeios.length), x + colW[1] / 2, y, { align: 'center' });
      x += colW[1];
      doc.text(`R$ ${v.total.toFixed(2)}`, x + colW[2] / 2, y, { align: 'center' });
      y += 7;
    });

    // Total geral
    y += 3;
    doc.line(14, y, 14 + colW.reduce((a, b) => a + b, 0), y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    x = 14 + colW[0] + colW[1];
    doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, x + colW[2] / 2, y, { align: 'center' });

    doc.save(`faturamento_${periodo.inicio.slice(0, 10)}_${periodo.fim.slice(0, 10)}.pdf`);
  }

  const thClass = 'px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider cursor-pointer hover:text-blue-accent select-none';
  const tdClass = 'px-4 py-3 text-sm text-text-dark';

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <h3 className="font-semibold text-text-dark">Relatório de Faturamento</h3>
        <button
          onClick={gerarPDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-dark hover:bg-red-hover text-white text-xs font-semibold transition-colors cursor-pointer">
          🖨️ Imprimir PDF
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className={thClass} onClick={() => toggleOrdenacao('nome')}>Vagoneteiro{seta('nome')}</th>
              <th className={thClass} onClick={() => toggleOrdenacao('qtd')}>Passeios{seta('qtd')}</th>
              <th className={`${thClass} text-right`} onClick={() => toggleOrdenacao('total')}>Valor Arrecadado{seta('total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ordenados.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className={tdClass}>{v.nome}</td>
                <td className={tdClass}>{v.passeios.length}</td>
                <td className={`${tdClass} text-right font-medium`}>R$ {v.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-gray-50">
              <td className={`${tdClass} font-bold`}>Total Geral</td>
              <td className={tdClass}>{ordenados.reduce((s, v) => s + v.passeios.length, 0)}</td>
              <td className={`${tdClass} text-right font-bold text-blue-accent`}>R$ {totalGeral.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
