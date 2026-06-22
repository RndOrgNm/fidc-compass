// Centralized TanStack Query keys for the prazos/alertas domain.
// Mutations in the Prazos tab and the global bell invalidate these.

export const prazoKeys = {
  /** All prazo-related queries (broad invalidation root). */
  all: ["prazos"] as const,
  /** Instances of a fund for a cycle (the Prazos tab payload). */
  instancias: (fundoId: number, ciclo?: string) =>
    ["prazos", "instancias", fundoId, ciclo ?? "atual"] as const,
  /** Obligations (rules) of a fund. */
  obrigacoes: (fundoId: number) => ["prazos", "obrigacoes", fundoId] as const,
};

export const alertaKeys = {
  /** All alert queries. */
  all: ["alertas"] as const,
  /** Active alerts for a user (drives the bell badge). */
  list: (usuarioId: string) => ["alertas", usuarioId] as const,
};

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: (usuarioId: string) => ["assignments", usuarioId] as const,
};
