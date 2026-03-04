import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listMonitoramentos,
  updateMonitoramento,
  createMonitoramento,
  deleteMonitoramento,
  type MonitoramentoFilters,
  type MonitoramentoUpdatePayload,
  type MonitoramentoCreatePayload,
  type MonitoramentoPipelineItem,
} from "@/lib/api/monitoramentoService";
import type { MonitoramentoPipelineStatus } from "@/data/pipelineData";

const MONITORAMENTO_KEY = "monitoramento";

export function useMonitoramento(filters: MonitoramentoFilters = {}) {
  return useQuery({
    queryKey: [MONITORAMENTO_KEY, filters],
    queryFn: () => listMonitoramentos(filters),
  });
}

export function useUpdateMonitoramento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MonitoramentoUpdatePayload }) =>
      updateMonitoramento(id, payload),

    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: [MONITORAMENTO_KEY] });
      const previousData = queryClient.getQueriesData({ queryKey: [MONITORAMENTO_KEY] });

      queryClient.setQueriesData(
        { queryKey: [MONITORAMENTO_KEY] },
        (old: { items: MonitoramentoPipelineItem[]; total: number } | undefined) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((i) =>
              i.id === id
                ? {
                    ...i,
                    ...(payload.status && { status: payload.status as MonitoramentoPipelineStatus }),
                    ...(payload.pending_items !== undefined && { pending_items: payload.pending_items }),
                    ...(payload.status_started_at && { days_in_status: 0 }),
                  }
                : i
            ),
          };
        }
      );

      return { previousData };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        (context.previousData as [unknown, unknown][]).forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey as unknown[], data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [MONITORAMENTO_KEY] });
    },
  });
}

export function useCreateMonitoramento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MonitoramentoCreatePayload) => createMonitoramento(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MONITORAMENTO_KEY] });
    },
  });
}

export function useDeleteMonitoramento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMonitoramento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MONITORAMENTO_KEY] });
    },
  });
}
