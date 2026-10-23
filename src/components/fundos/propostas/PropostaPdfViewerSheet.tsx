import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { PdfPagesViewer } from "@/components/PdfPagesViewer";
import type { PropostaFonte } from "@/types/propostas";

/**
 * A right-side Sheet like `DocumentViewerSheet` (Ativos) and the chatbot's source
 * viewer (`src/pages/Agent.tsx`), but the document is `PdfPagesViewer`: every page in
 * one column that scrolls, opened straight at the clicked source's first page, with
 * Anterior/Próxima and the page counter following the scroll.
 *
 * The cited excerpt (`fonte.texto`) is shown only when there is no file to draw (Word
 * can't be drawn, and a proposal may have no file): then it is all the sheet has. With a
 * PDF it is not repeated, since the page opens where the source is.
 *
 * Whoever opens the Sheet is responsible for supplying the file bytes
 * (`fileData`) and whether they are still `loading` — this component doesn't
 * know how to fetch the file from anywhere, only how to display what it's given.
 */
export function PropostaPdfViewerSheet({
  open,
  onOpenChange,
  arquivoNome,
  fileData,
  loading = false,
  fonte,
  rawUrl,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  arquivoNome: string;
  fileData: ArrayBuffer | null;
  loading?: boolean;
  /** The cited source that was clicked. */
  fonte: PropostaFonte | null;
  /** Link to open the original file (e.g. on OneDrive), if there is one. */
  rawUrl?: string;
}) {
  const startPage = fonte?.page ?? 1;
  const [currentPage, setCurrentPage] = useState(startPage);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (open) setCurrentPage(startPage);
  }, [open, startPage]);

  const hasFile = fileData != null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="!w-[35%] !max-w-none p-0 flex flex-col [&>button]:hidden border-l !z-40"
        hideOverlay
      >
        <SheetHeader className="flex-shrink-0 flex-row items-center justify-between border-b px-6 py-4">
          <SheetTitle className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{arquivoNome}</span>
          </SheetTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {/* The document is one column of pages that scrolls inside this box; the page counter
            and Anterior/Próxima follow it. */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-100">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando documento...</span>
            </div>
          ) : hasFile ? (
            <PdfPagesViewer
              pdfData={fileData}
              page={currentPage}
              onPageChange={setCurrentPage}
              onTotalPages={setTotalPages}
              className="h-full w-full"
            />
          ) : (
            <p className="max-w-[32ch] p-4 text-center text-sm text-muted-foreground">
              A visualização do arquivo não está disponível. O trecho citado aparece abaixo.
            </p>
          )}
        </div>

        {/* The page opens where the source is, so the excerpt is only shown when there is no
            file to draw: then it is all the panel has. */}
        {fonte && !hasFile && !loading && (
          <div className="max-h-[40%] flex-shrink-0 overflow-y-auto border-t bg-muted/30 px-6 py-3 text-[12.5px] text-muted-foreground">
            <span className="font-medium text-foreground">{fonte.trecho}:</span> “{fonte.texto}”
          </div>
        )}

        <SheetFooter className="flex flex-shrink-0 items-center justify-between border-t px-6 py-4">
          <span className="text-sm text-muted-foreground">
            {hasFile ? `Página ${currentPage} de ${totalPages}` : null}
          </span>
          <div className="flex gap-2">
            {hasFile && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Próxima <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </>
            )}
            {rawUrl && (
              <Button variant="outline" onClick={() => window.open(rawUrl, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="mr-1 h-4 w-4" /> Abrir no OneDrive
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
