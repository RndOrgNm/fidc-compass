import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { PdfViewerCanvas } from "@/components/PdfViewerCanvas";
import { XlsxViewerTable } from "@/components/XlsxViewerTable";
import { docLabel } from "@/data/ativosData";
import { getDownloadUrl, type DocumentoResponse } from "@/lib/api/documentoService";

/**
 * Mirrors the chatbot's "Fontes" viewer (src/pages/Agent.tsx): a right-side
 * Sheet rendering the PDF via the same pdf.js canvas component. Unlike the
 * chatbot (one static, well-known CVM PDF), each Documento here is an
 * arbitrary uploaded file — so non-PDF files fall back to a direct download
 * instead of an in-panel preview. Shared by Ativos and Documentos da Gestora.
 */
type FileKind = "pdf" | "xlsx" | "other";

function fileKindOf(filename?: string | null): FileKind {
  const lower = (filename || "").toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "xlsx";
  return "other";
}

export function DocumentViewerSheet({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocumentoResponse | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileKind = fileKindOf(doc?.arquivo_nome);
  const isPdf = fileKind === "pdf";
  const isXlsx = fileKind === "xlsx";

  useEffect(() => {
    if (!open || !doc) {
      setFileData(null);
      setRawUrl(null);
      setError(null);
      setCurrentPage(1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setFileData(null);
    setCurrentPage(1);
    setTotalPages(1);

    getDownloadUrl(doc.id)
      .then(async ({ download_url }) => {
        if (cancelled) return;
        setRawUrl(download_url);
        if (fileKindOf(doc.arquivo_nome) === "other") {
          setLoading(false);
          return;
        }
        const res = await fetch(download_url);
        if (!res.ok) throw new Error(`Erro ${res.status} ao baixar o arquivo`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        setFileData(buf);
        setLoading(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message || "Não foi possível carregar o documento");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  const title = doc
    ? `${docLabel(doc.tipo, doc.nome_personalizado)}${doc.periodo_referencia ? ` · ${doc.periodo_referencia}` : ""}`
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="!w-[35%] !max-w-none p-0 flex flex-col [&>button]:hidden border-l !z-40"
        hideOverlay
      >
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0 flex-row items-center justify-between">
          <SheetTitle className="truncate">{title}</SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando documento...</span>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center gap-2 text-destructive p-4 text-center">
              <span className="text-sm font-medium">Não foi possível carregar o documento</span>
              <span className="text-xs">{error}</span>
            </div>
          )}
          {!loading && !error && isPdf && (
            <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden flex items-center justify-center">
              <PdfViewerCanvas
                pdfData={fileData}
                currentPage={currentPage}
                onTotalPages={setTotalPages}
                className="w-full h-full min-h-[400px]"
              />
            </div>
          )}
          {!loading && !error && isXlsx && (
            <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden flex items-center justify-center">
              <XlsxViewerTable
                fileData={fileData}
                currentSheet={currentPage}
                onSheetNames={(names) => setTotalPages(names.length)}
                className="w-full h-full min-h-[400px]"
              />
            </div>
          )}
          {!loading && !error && !isPdf && !isXlsx && (
            <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p className="max-w-xs text-sm">
                Pré-visualização não disponível para {doc?.arquivo_nome || "este arquivo"}.
              </p>
              {rawUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(rawUrl, "_blank", "noopener,noreferrer")}
                >
                  <Upload className="mr-1 h-4 w-4 rotate-180" /> Baixar arquivo
                </Button>
              )}
            </div>
          )}
        </div>

        {(isPdf || isXlsx) && !loading && !error && (
          <SheetFooter className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              {isPdf ? "Página" : "Aba"} {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
