import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

// Same worker setup as PdfViewerCanvas (the legacy build avoids "toHex is not a function").
if (typeof window !== "undefined" && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
}

type PdfDoc = Awaited<ReturnType<typeof getDocument>["promise"]>;

const PAGE_GAP_PX = 12;

/**
 * The page the reader is on: the last one whose top is above a line a third of the way down
 * the viewport. `tops` are the pages' offsets inside the scroll container.
 */
export function pageAtScroll(tops: number[], scrollTop: number, clientHeight: number): number {
  const line = scrollTop + clientHeight * 0.35;
  let current = 1;
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] <= line) current = i + 1;
    else break;
  }
  return current;
}

interface PdfPagesViewerProps {
  pdfData: ArrayBuffer | null;
  /** The page to show: changing it scrolls to that page. */
  page: number;
  /** The page the reader scrolled to. */
  onPageChange?: (page: number) => void;
  onTotalPages?: (total: number) => void;
  className?: string;
}

/**
 * A PDF as one continuous column of pages that scrolls like any reader, unlike
 * `PdfViewerCanvas`, which draws a single page. Pages are drawn only when they come near the
 * viewport, so a long document does not render all at once.
 */
export function PdfPagesViewer({
  pdfData,
  page,
  onPageChange,
  onTotalPages,
  className = "",
}: PdfPagesViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const docRef = useRef<PdfDoc | null>(null);
  const rendered = useRef<Set<number>>(new Set());
  const shownPage = useRef(1);
  const positioned = useRef(false);
  const frame = useRef(0);
  const travelling = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout>>();

  const [numPages, setNumPages] = useState(0);
  const [aspect, setAspect] = useState(Math.SQRT2);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the document, and measure the first page to size every placeholder.
  useEffect(() => {
    if (!pdfData) return;
    let cancelled = false;
    setReady(false);
    setError(null);
    rendered.current = new Set();
    positioned.current = false;
    getDocument({ data: pdfData })
      .promise.then(async (doc) => {
        if (cancelled) {
          doc.destroy();
          return;
        }
        const first = await doc.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setAspect(viewport.height / viewport.width);
        setNumPages(doc.numPages);
        onTotalPages?.(doc.numPages);
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Erro ao carregar PDF");
      });
    return () => {
      cancelled = true;
      docRef.current?.destroy();
      docRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfData]);

  // Draw a page the first time it comes near the viewport.
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const drawPage = (n: number) => {
      const doc = docRef.current;
      const canvas = canvasRefs.current[n - 1];
      const box = pageRefs.current[n - 1];
      if (!doc || !canvas || !box || rendered.current.has(n)) return;
      rendered.current.add(n);
      doc
        .getPage(n)
        .then((p) => {
          const natural = p.getViewport({ scale: 1 });
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const viewport = p.getViewport({ scale: (box.clientWidth / natural.width) * dpr });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          return p.render({ canvas, viewport }).promise.then(() => p.cleanup());
        })
        .catch((err) => {
          rendered.current.delete(n);
          setError(err?.message || "Erro ao renderizar página");
        });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) drawPage(Number((entry.target as HTMLElement).dataset.page));
        }
      },
      { root: containerRef.current, rootMargin: "800px 0px" },
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [ready, numPages]);

  // Go to the requested page: at once the first time, smoothly after that.
  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;
    if (positioned.current && page === shownPage.current) return;
    const target = pageRefs.current[Math.min(Math.max(page, 1), numPages) - 1];
    if (!target) return;
    const smooth = positioned.current;
    if (smooth) {
      // While the scroll we start is under way, the pages it passes are not the reader's
      // choice: they are not reported, or a quick second click would start from one of them.
      travelling.current = true;
      clearTimeout(settle.current);
      settle.current = setTimeout(finishTravel, 400);
    }
    container.scrollTo({
      top: target.offsetTop - PAGE_GAP_PX,
      behavior: smooth ? "smooth" : "auto",
    });
    shownPage.current = page;
    positioned.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, page, numPages]);

  const reportPage = () => {
    const container = containerRef.current;
    if (!container || !positioned.current) return;
    const tops = pageRefs.current.map((el) => el?.offsetTop ?? 0);
    const current = pageAtScroll(tops, container.scrollTop, container.clientHeight);
    if (current !== shownPage.current) {
      shownPage.current = current;
      onPageChange?.(current);
    }
  };

  // The scroll we started has come to rest: from here the position is the reader's again.
  const finishTravel = () => {
    travelling.current = false;
    reportPage();
  };

  const handleScroll = () => {
    if (travelling.current) {
      clearTimeout(settle.current);
      settle.current = setTimeout(finishTravel, 150);
      return;
    }
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      reportPage();
    });
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(settle.current);
    },
    [],
  );

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 text-destructive ${className}`}>
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!pdfData || !ready) {
    return (
      <div className={`flex items-center justify-center p-4 text-muted-foreground ${className}`}>
        <span className="text-sm">Carregando...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative overflow-y-auto overscroll-contain bg-slate-100 p-3 ${className}`}
    >
      <div className="flex flex-col" style={{ gap: PAGE_GAP_PX }}>
        {Array.from({ length: numPages }, (_, i) => (
          <div
            key={i}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
            data-page={i + 1}
            className="w-full bg-white shadow"
            style={{ aspectRatio: `1 / ${aspect}` }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              className="block h-full w-full object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
