import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listProspectionWorkflows,
  createNewLead,
  createRecebivel,
  transitionWorkflow,
  assignWorkflow,
  updateRecebivel,
  deleteRecebivel,
  getRecebiveisChecklist,
  type WorkflowFilters,
  type NewLeadCreate,
  type TransitionRequest,
  type RecebivelUpdateRequest,
  type RecebivelCreatePayload,
} from "@/lib/api/prospectionService";

const WORKFLOWS_KEY = "prospection-workflows";
const CHECKLIST_KEY = "recebiveis-checklist";

/**
 * Fetch the canonical checklist per status. Backend is the source of truth.
 */
export function useRecebiveisChecklist() {
  return useQuery({
    queryKey: [CHECKLIST_KEY],
    queryFn: getRecebiveisChecklist,
  });
}

/**
 * Fetch prospection workflows with optional filters.
 */
export function useProspectionWorkflows(filters: WorkflowFilters = {}) {
  return useQuery({
    queryKey: [WORKFLOWS_KEY, filters],
    queryFn: () => listProspectionWorkflows(filters),
  });
}

/**
 * Create a new lead (cedente + workflow atomically).
 * Invalidates the workflows list on success.
 */
export function useCreateNewLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NewLeadCreate) => createNewLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}

/**
 * Create a new recebivel (for existing cedente).
 * Invalidates the workflows list on success.
 */
export function useCreateRecebivel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RecebivelCreatePayload) => createRecebivel(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}

/**
 * Transition a workflow to a new status (used by drag-and-drop).
 * Uses optimistic updates for instant UI feedback.
 */
export function useTransitionWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      data,
    }: {
      workflowId: string;
      data: TransitionRequest;
    }) => transitionWorkflow(workflowId, data),

    // Optimistic update: move the card instantly before the API responds
    onMutate: async ({ workflowId, data }) => {
      // Cancel in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [WORKFLOWS_KEY] });

      // Snapshot the current cache for rollback
      const previousData = queryClient.getQueriesData({ queryKey: [WORKFLOWS_KEY] });

      // Optimistically update every matching cache entry
      queryClient.setQueriesData(
        { queryKey: [WORKFLOWS_KEY] },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((wf: any) =>
              wf.id === workflowId ? { ...wf, status: data.status } : wf
            ),
          };
        }
      );

      return { previousData };
    },

    // If the API fails, roll back to the snapshot
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    // Always refetch after settled to ensure consistency with the backend
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}

/**
 * Assign a workflow to a user.
 * Uses optimistic updates for instant UI feedback.
 */
export function useAssignWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      assignedTo,
    }: {
      workflowId: string;
      assignedTo: string;
    }) => assignWorkflow(workflowId, assignedTo),

    // Optimistic update: show assignment instantly
    onMutate: async ({ workflowId, assignedTo }) => {
      await queryClient.cancelQueries({ queryKey: [WORKFLOWS_KEY] });

      const previousData = queryClient.getQueriesData({ queryKey: [WORKFLOWS_KEY] });

      queryClient.setQueriesData(
        { queryKey: [WORKFLOWS_KEY] },
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((wf: any) =>
              wf.id === workflowId ? { ...wf, assigned_to: assignedTo } : wf
            ),
          };
        }
      );

      return { previousData };
    },

    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}

/**
 * Delete a recebivel. Only allowed for terminal statuses (encerrado, rejeitado).
 */
export function useDeleteRecebivel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflowId: string) => deleteRecebivel(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}

/**
 * Update a recebivel (e.g. pending_items for checklist).
 */
export function useUpdateRecebivel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      data,
    }: {
      workflowId: string;
      data: RecebivelUpdateRequest;
    }) => updateRecebivel(workflowId, data),
    onMutate: async ({ workflowId, data }) => {
      await queryClient.cancelQueries({ queryKey: [WORKFLOWS_KEY] });
      const previousData = queryClient.getQueriesData({ queryKey: [WORKFLOWS_KEY] });
      if (data.pending_items !== undefined) {
        queryClient.setQueriesData(
          { queryKey: [WORKFLOWS_KEY] },
          (old: any) => {
            if (!old?.items) return old;
            return {
              ...old,
              items: old.items.map((wf: any) =>
                wf.id === workflowId ? { ...wf, pending_items: data.pending_items } : wf
              ),
            };
          }
        );
      }
      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]: [any, any]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}
