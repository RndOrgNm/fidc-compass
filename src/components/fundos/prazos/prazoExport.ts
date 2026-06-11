import type { InstanciaResponse } from "@/lib/api/prazoService";
import { CAT_META, TIPO_LABEL, STATUS_META, displayStatus, formatVencBr } from "./prazoMeta";

// Columns shared by PDF and Excel: tópico, categoria, tipo, vencimento, status.
const HEADERS = ["Tópico", "Categoria", "Tipo", "Vencimento", "Status"];

function toRows(instancias: InstanciaResponse[]): string[][] {
  return instancias.map((i) => [
    i.topico,
    CAT_META[i.categoria].label,
    TIPO_LABEL[i.tipo_prazo],
    formatVencBr(i.data_vencimento),
    STATUS_META[displayStatus(i)].label,
  ]);
}

export async function exportPrazosExcel(
  instancias: InstanciaResponse[],
  filename: string
): Promise<void> {
  const { utils, writeFile } = await import("xlsx");
  const ws = utils.aoa_to_sheet([HEADERS, ...toRows(instancias)]);
  ws["!cols"] = [{ wch: 38 }, { wch: 14 }, { wch: 22 }, { wch: 13 }, { wch: 20 }];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Prazos");
  writeFile(wb, `${filename}.xlsx`);
}

export async function exportPrazosPdf(
  instancias: InstanciaResponse[],
  filename: string,
  fundName: string,
  ciclo: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  doc.setFontSize(13);
  doc.text(`Calendário de obrigações — ${fundName}`, 14, 14);
  doc.setFontSize(9);
  doc.setTextColor(120);
  const geradoEm = new Date().toLocaleDateString("pt-BR");
  doc.text(`Ciclo ${ciclo} · gerado em ${geradoEm}`, 14, 20);

  autoTable(doc, {
    head: [HEADERS],
    body: toRows(instancias),
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}
