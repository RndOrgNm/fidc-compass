import { useEffect, useState } from "react";
import type { HomeDashboardMetrics } from "@/types/homeDashboard";

const METRICS_URL = "/dashboard/home-metrics.json";

export interface UseHomeMetricsResult {
  data: HomeDashboardMetrics | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the home dashboard metrics (`public/dashboard/home-metrics.json`,
 * exported from `data_fidc`). Shared by the Painel (Home) and the Fundos hub.
 */
export function useHomeMetrics(): UseHomeMetricsResult {
  const [data, setData] = useState<HomeDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(METRICS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as HomeDashboardMetrics;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar métricas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
