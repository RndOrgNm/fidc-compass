import { formatDistanceStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * "há 12 minutos" for the time the OneDrive was last checked; undefined when there is no
 * valid time, so the caller shows nothing instead of a guess.
 */
export function syncLabel(lastSyncedAt: string | null | undefined, now: Date = new Date()): string | undefined {
  if (!lastSyncedAt) return undefined;
  const date = new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return formatDistanceStrict(date, now, { locale: ptBR, addSuffix: true });
}
