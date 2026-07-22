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

  const rows = useMemo(() => {
    if (!workbook) return [];
    const sheetName = workbook.SheetNames[currentSheet - 1];
    const sheet = sheetName ? workbook.Sheets[sheetName] : null;
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  }, [workbook, currentSheet]);

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

  if (!rows.length) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground p-4 ${className}`}>
        <span className="text-sm">Planilha vazia.</span>
      </div>
    );
  }

  return (
    <div className={`overflow-auto bg-white ${className}`}>
      <table className="min-w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i === 0 ? "bg-muted/50 font-medium" : "even:bg-muted/20"}>
              {row.map((cell, j) => (
                <td key={j} className="border px-3 py-1.5 whitespace-nowrap">
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
