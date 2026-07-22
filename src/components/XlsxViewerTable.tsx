import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

interface XlsxViewerTableProps {
  fileData: ArrayBuffer | null;
  currentSheet: number;
  onSheetNames?: (names: string[]) => void;
  className?: string;
}

export function XlsxViewerTable({
  fileData,
  currentSheet,
  onSheetNames,
  className = "",
}: XlsxViewerTableProps) {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileData) {
      setWorkbook(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const wb = XLSX.read(fileData, { type: "array" });
      setWorkbook(wb);
      onSheetNames?.(wb.SheetNames);
    } catch (err) {
      setError((err as Error)?.message || "Erro ao carregar planilha");
    } finally {
      setLoading(false);
    }
  }, [fileData, onSheetNames]);

  const { grid, merges } = useMemo(() => {
    const empty = { grid: [] as string[][], merges: [] };
    if (!workbook) return empty;
    const sheetName = workbook.SheetNames[currentSheet - 1];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!sheet || !sheet["!ref"]) return empty;

    // Build a full rectangular grid (not sheet_to_json's ragged rows) so cell
    // coordinates line up 1:1 with `!merges`, which are absolute row/col indexes.
    const range = XLSX.utils.decode_range(sheet["!ref"]);
    const g: string[][] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const row: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        row.push(cell ? XLSX.utils.format_cell(cell) : "");
      }
      g.push(row);
    }
    const m = (sheet["!merges"] || []).map((merge) => ({
      s: { r: merge.s.r - range.s.r, c: merge.s.c - range.s.c },
      e: { r: merge.e.r - range.s.r, c: merge.e.c - range.s.c },
    }));
    return { grid: g, merges: m };
  }, [workbook, currentSheet]);

  // Merged cells: sheet_to_json-style flattening only keeps the value in the
  // top-left cell, so a merged block reads as mostly blank. Track spans so
  // the top-left cell renders with rowSpan/colSpan (like Excel) and the rest
  // of the block is skipped, instead of showing empty cells around it.
  const spans = useMemo(() => {
    const map = new Map<string, { rowSpan: number; colSpan: number } | "skip">();
    for (const merge of merges) {
      const rowSpan = merge.e.r - merge.s.r + 1;
      const colSpan = merge.e.c - merge.s.c + 1;
      if (rowSpan > 1 || colSpan > 1) {
        map.set(`${merge.s.r},${merge.s.c}`, { rowSpan, colSpan });
      }
      for (let r = merge.s.r; r <= merge.e.r; r++) {
        for (let c = merge.s.c; c <= merge.e.c; c++) {
          if (r === merge.s.r && c === merge.s.c) continue;
          map.set(`${r},${c}`, "skip");
        }
      }
    }
    return map;
  }, [merges]);

  if (error) {
    return (
      <div className={`flex items-center justify-center text-destructive p-4 ${className}`}>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (loading || !fileData) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground p-4 ${className}`}>
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  if (!grid.length) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground p-4 ${className}`}>
        <span className="text-sm">Planilha vazia.</span>
      </div>
    );
  }

  return (
    <div className={`overflow-auto bg-white text-slate-900 ${className}`}>
      <table className="min-w-full border-collapse text-sm">
        <tbody>
          {grid.map((row, i) => (
            <tr key={i} className={i === 0 ? "bg-slate-100 font-medium" : "even:bg-slate-50"}>
              {row.map((cell, j) => {
                const span = spans.get(`${i},${j}`);
                if (span === "skip") return null;
                return (
                  <td
                    key={j}
                    rowSpan={span?.rowSpan}
                    colSpan={span?.colSpan}
                    className="border border-slate-200 px-3 py-1.5 whitespace-nowrap"
                  >
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
