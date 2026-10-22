import { useEffect, useState } from "react";

import { getOnedriveStatus } from "@/lib/api/onedriveService";
import { syncLabel } from "@/lib/syncLabel";

const REFRESH_MS = 60_000;

/**
 * The "há N minutos" label for the last OneDrive check, kept fresh every minute.
 * Undefined while it is unknown or the request failed — the label is then not shown.
 */
export function useOnedriveStatus(): string | undefined {
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      getOnedriveStatus()
        .then((status) => {
          if (!cancelled) setLastSyncedAt(status.last_synced_at);
        })
        .catch(() => {
          if (!cancelled) setLastSyncedAt(null);
        });
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return syncLabel(lastSyncedAt);
}
