import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TransacaoComSaldo } from '../types/transaction';
import {
  roundCurrency,
  formatDateBR,
  getLocalTodayISO,
  compareTransactionsChronologically,
} from '../utils/formatters';

interface ExportPdfOptions {
  transactions: TransacaoComSaldo[];
  userEmail?: string | null;
}

export function exportCashbookToPdf({ transactions, userEmail }: ExportPdfOptions): void {
  if (!transactions || transactions.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Ordena os itens selecionados cronologicamente (da data mais antiga para a mais recente)
  const sorted = [...transactions].sort(compareTransactionsChronologically);

  // Cálculos dos totalizadores estritamente dos itens selecionados com arredondamento monetário
  const totalEntradas = roundCurrency(
    sorted.reduce((acc, t) => acc + roundCurrency(t.Entrada), 0)
  );
  const totalSaidas = roundCurrency(
    sorted.reduce((acc, t) => acc + roundCurrency(t.Saida), 0)
  );
  const saldoLiquido = roundCurrency(totalEntradas - totalSaidas);

  const now = new Date();
  const dataGeracaoStr = now.toLocaleDateString('pt-BR');
  const horaGeracaoStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatMoneyPdf = (val: number): string => {
    const rounded = roundCurrency(val);
    return (
      'R$ ' +
      rounded.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  // =========================================================================
  // CABEÇALHO DO DOCUMENTO (Foco na clareza de livro-caixa físico)
  // =========================================================================
  doc.setTextColor(20, 20, 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Relatório de Caixa', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`Data de Emissão: ${dataGeracaoStr} às ${horaGeracaoStr}`, margin, 24);

  if (userEmail) {
    doc.text(`Conta: ${userEmail}`, margin, 29);
  }

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.4);
  const headerBottomY = userEmail ? 33 : 28;
  doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);

  // =========================================================================
  // DADOS DA TABELA (5 Colunas: Data, Descrição, Entrada, Saída, Saldo)
  // =========================================================================
  const tableRows = sorted.map((item) => [
    formatDateBR(item.Data),
    item.Descricao || '-',
    item.Entrada > 0 ? formatMoneyPdf(item.Entrada) : '-',
    item.Saida > 0 ? formatMoneyPdf(item.Saida) : '-',
    formatMoneyPdf(item.saldoAcumulado),
  ]);

  const tableFoot = [
    [
      {
        content: 'TOTAIS DOS ITENS SELECIONADOS:',
        colSpan: 2,
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
      {
        content: formatMoneyPdf(totalEntradas),
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
      {
        content: formatMoneyPdf(totalSaidas),
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
      {
        content: formatMoneyPdf(saldoLiquido),
        styles: { halign: 'right' as const, fontStyle: 'bold' as const },
      },
    ],
  ];

  autoTable(doc, {
    startY: headerBottomY + 4,
    head: [['Data', 'Descrição', 'Entrada', 'Saída', 'Saldo']],
    body: tableRows,
    foot: tableFoot,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      textColor: [20, 20, 20],
      fillColor: [255, 255, 255],
      lineColor: [60, 60, 60],
      lineWidth: 0.2,
      cellPadding: 2.8,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [10, 10, 10],
      fontStyle: 'bold',
      lineColor: [40, 40, 40],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [10, 10, 10],
      fontStyle: 'bold',
      lineColor: [40, 40, 40],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 34, halign: 'right' },
    },
    didDrawPage: (data) => {
      const pageNumber = data.pageNumber;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    },
    margin: { left: margin, right: margin, top: 14, bottom: 14 },
  });

  const lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 100;

  // =========================================================================
  // SEÇÃO DE TOTALIZADOR DESTACADA NO FINAL DO RELATÓRIO
  // =========================================================================
  let summaryY = lastTableY + 8;
  if (summaryY + 36 > pageHeight - margin) {
    doc.addPage();
    summaryY = margin + 4;
  }

  const boxWidth = 95;
  const boxX = pageWidth - margin - boxWidth;
  const boxHeight = 28;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.rect(boxX, summaryY, boxWidth, boxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('RESUMO DOS ITENS SELECIONADOS', boxX + 4, summaryY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Total de Entradas:', boxX + 4, summaryY + 12);
  doc.text(formatMoneyPdf(totalEntradas), boxX + boxWidth - 4, summaryY + 12, { align: 'right' });

  doc.text('Total de Saídas:', boxX + 4, summaryY + 18);
  doc.text(formatMoneyPdf(totalSaidas), boxX + boxWidth - 4, summaryY + 18, { align: 'right' });

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.2);
  doc.line(boxX + 4, summaryY + 21, boxX + boxWidth - 4, summaryY + 21);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Saldo Líquido:', boxX + 4, summaryY + 26);
  doc.text(formatMoneyPdf(saldoLiquido), boxX + boxWidth - 4, summaryY + 26, { align: 'right' });

  const fileNameDate = getLocalTodayISO();
  const filename = `relatorio-caixa-${fileNameDate}.pdf`;
  doc.save(filename);
}
