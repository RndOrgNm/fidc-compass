import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { PdfViewerCanvas } from "@/components/PdfViewerCanvas";
import type { PropostaFonte } from "@/types/propostas";

/**
 * Same pattern as `DocumentViewerSheet` (Ativos) and the chatbot's source
 * viewer (`src/pages/Agent.tsx`) — a right-side Sheet with `PdfViewerCanvas`.
 * The difference that justifies its own component: it opens straight at the
 * clicked source's page (`startPage`), not always page 1.
 *
 * The quoted excerpt (`fonte.texto`) is shown as a caption below the page,
 * not overlaid on the PDF — `PdfViewerCanvas` renders to a `<canvas>` with no
 * text layer, so there's nowhere to draw a real highlight over the render.
 *
 * Whoever opens the Sheet is responsible for supplying the file bytes
 * (`fileData`) — this component doesn't know how to fetch the file from
 * anywhere, only how to display what it's given.
 */
export function PropostaPdfViewerSheet({
  open,
  onOpenChange,
  arquivoNome,
  fileData,
  startPage,
  fontes,
  rawUrl,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  arquivoNome: string;
  fileData: ArrayBuffer | null;
  startPage: number;
  fontes: PropostaFonte[];
  /** Link to open the original file (e.g. on OneDrive), if there is one. */
  rawUrl?: string;
}) {
  const [currentPage, setCurrentPage] = useState(startPage);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (open) setCurrentPage(startPage);
  }, [open, startPage]);

  const activeFonte = fontes.find((f) => f.page === currentPage);
  const loading = open && fileData == null;

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

        <div className="flex flex-1 flex-col items-center justify-center overflow-hidden bg-slate-100 p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Carregando documento...</span>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-white shadow-xl">
              <PdfViewerCanvas
                pdfData={fileData}
                currentPage={currentPage}
                onTotalPages={setTotalPages}
                className="h-full min-h-[400px] w-full"
              />
            </div>
          )}
        </div>

        {activeFonte && (
          <div className="flex-shrink-0 border-t bg-muted/30 px-6 py-3 text-[12.5px] text-muted-foreground">
            <span className="font-medium text-foreground">{activeFonte.trecho}:</span> “{activeFonte.texto}”
          </div>
        )}

        <SheetFooter className="flex flex-shrink-0 items-center justify-between border-t px-6 py-4">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
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
