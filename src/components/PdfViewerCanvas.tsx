import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Configure worker once (public folder copy for Vite)
if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
}

interface PdfViewerCanvasProps {
  pdfData: ArrayBuffer | null;
  currentPage: number;
  onTotalPages?: (total: number) => void;
  className?: string;
}

export function PdfViewerCanvas({
  pdfData,
  currentPage,
  onTotalPages,
  className = "",
}: PdfViewerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<Awaited<ReturnType<typeof getDocument>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docReady, setDocReady] = useState(false);

  // Load document when pdfData is available
  useEffect(() => {
    if (!pdfData) {
      setDocReady(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDocReady(false);
    getDocument({ data: pdfData })
      .promise.then((doc) => {
        if (cancelled) return;
        docRef.current = doc;
        onTotalPages?.(doc.numPages);
        setLoading(false);
        setDocReady(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Erro ao carregar PDF");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [pdfData, onTotalPages]);

  // Render current page when doc is ready and currentPage changes
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !docReady) return;

    let cancelled = false;
    doc
      .getPage(currentPage)
      .then((page) => {
        if (cancelled) return;
        const scale = 2;
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        page.render({
          canvasContext: ctx,
          viewport,
        }).promise.then(() => {
          page.cleanup();
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Erro ao renderizar página");
      });

    return () => { cancelled = true; };
  }, [docReady, currentPage]);

  if (error) {
    return (
      <div className={`flex items-center justify-center text-destructive p-4 ${className}`}>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (loading || !pdfData) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground p-4 ${className}`}>
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  return (
    <div className={`overflow-auto flex justify-center bg-white ${className}`}>
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
