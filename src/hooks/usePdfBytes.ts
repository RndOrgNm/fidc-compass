import { useEffect, useState } from "react";

interface PdfBytes {
  data: ArrayBuffer | null;
  loading: boolean;
}

/**
 * Downloads a file's bytes for the PDF viewer. With no `url` it does nothing;
 * a failed download leaves `data` null so the viewer falls back to its
 * text-only mode instead of spinning forever.
 */
export function usePdfBytes(url: string | null | undefined): PdfBytes {
  const [state, setState] = useState<PdfBytes>({ data: null, loading: false });

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
