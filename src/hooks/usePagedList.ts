import { useMemo, useState } from "react";

/**
 * Client-side pagination over an already-fetched array. Used for the
 * documentos lists (backend returns everything grouped by ativo/gestora in
 * one call — there's no per-group `limit`/`offset` to paginate server-side,
 * so each card slices its own already-fetched array instead).
 */
export function usePagedList<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return { page: safePage, setPage, totalPages, pageItems };
}
