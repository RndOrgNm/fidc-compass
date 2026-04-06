/**
 * Export buttons (Excel + PDF) for a Plotly `table` trace JSON.
 *
 * The JSON is fetched once and transformed to a 2-D array:
 *   rows[0] = header labels  (trace.header.values  — flat or nested)
 *   rows[1..] = data rows   (trace.cells.values    — column-major → transposed)
 *
 * Both Excel and PDF are generated entirely in the browser — no server needed.
 */
import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlotlyTableTrace = {
  type?: string;
  header?: { values?: unknown[] | unknown };
  cells?: { values?: unknown[][] | unknown };
};

/** Normalise a Plotly column-of-values into a flat string array. */
function flatStrings(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => (x == null ? "" : String(x)));
  }
  return v == null ? [] : [String(v)];
}

/** Build rows[header, ...data] from the first table trace in a Plotly JSON payload. */
function buildRows(payload: { data: PlotlyTableTrace[] }): string[][] {
  const trace = payload.data.find((t) => t.type === "table") ?? payload.data[0];
  if (!trace) return [];

  const headerCols: unknown[] = Array.isArray(trace.header?.values)
    ? (trace.header!.values as unknown[])
    : [];
  const headers = headerCols.map((h) => flatStrings(h)[0] ?? "");

  const cellCols: unknown[][] = Array.isArray(trace.cells?.values)
    ? (trace.cells!.values as unknown[][])
    : [];

  if (!cellCols.length) return [headers];

  const rowCount = Math.max(...cellCols.map((c) => (Array.isArray(c) ? c.length : 0)));
  const rows: string[][] = [headers];
  for (let r = 0; r < rowCount; r++) {
    rows.push(cellCols.map((col) => (Array.isArray(col) ? String(col[r] ?? "") : "")));
  }
  return rows;
}

async function fetchRows(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  return buildRows(payload as { data: PlotlyTableTrace[] });
}

async function exportExcel(rows: string[][], filename: string): Promise<void> {
  const { utils, writeFile } = await import("xlsx");
  const ws = utils.aoa_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Dados");
  writeFile(wb, `${filename}.xlsx`);
}

async function exportPdf(
  rows: string[][],
  filename: string,
  title: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const [header, ...body] = rows;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(13);
  doc.text(title, 14, 14);

  autoTable(doc, {
    head: [header],
    body,
    startY: 20,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    alternateRowStyles: { fillColor: [240, 240, 240] },
    margin: { top: 20, left: 10, right: 10 },
  });

  doc.save(`${filename}.pdf`);
}

export type TableExportButtonsProps = {
  /** URL of the Plotly JSON file (same as what PlotlyWebFigure uses) */
  url: string;
  /** Base filename, without extension */
  filename: string;
  /** Title for the PDF header */
  title?: string;
};

export function TableExportButtons({ url, filename, title = filename }: TableExportButtonsProps) {
  const [busy, setBusy] = useState<"excel" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (format: "excel" | "pdf") => {
    setBusy(format);
    setError(null);
    try {
      const rows = await fetchRows(url);
      if (rows.length < 2) {
        setError("Tabela vazia.");
        return;
      }
      if (format === "excel") {
        await exportExcel(rows, filename);
      } else {
        await exportPdf(rows, filename, title);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao exportar.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => handle("excel")}
        disabled={busy !== null}
        title="Exportar para Excel (.xlsx)"
      >
        {busy === "excel" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
        )}
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => handle("pdf")}
        disabled={busy !== null}
        title="Exportar para PDF"
      >
        {busy === "pdf" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5 text-rose-400" />
        )}
        PDF
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
