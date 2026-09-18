// Centralized TanStack Query keys for the prazos/alertas domain.
// Mutations in the Prazos tab and the global bell invalidate these.

import type { PrazoOwner } from "./api/prazoService";

/** `PrazoOwner` as a stable, serializable key segment — a fund or the Gestora. */
function ownerKeyPart(owner: PrazoOwner): readonly [string, number | string] {
  return owner.fundo_id != null ? (["fundo", owner.fundo_id] as const) : (["gestora", owner.gestora_id] as const);
}

export const prazoKeys = {
  /** All prazo-related queries (broad invalidation root). */
  all: ["prazos"] as const,
  /** Instances of a fund/Gestora for a cycle (the Prazos tab payload). */
  instancias: (owner: PrazoOwner, ciclo?: string) =>
    ["prazos", "instancias", ...ownerKeyPart(owner), ciclo ?? "atual"] as const,
  /** Obligations (rules) of a fund/Gestora. */
  obrigacoes: (owner: PrazoOwner) => ["prazos", "obrigacoes", ...ownerKeyPart(owner)] as const,
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

export const documentoKeys = {
  /** All ativos/documentos queries (broad invalidation root). */
  all: ["documentos"] as const,
  /** Ativos + documentos of a fund, grouped by ativo (the Ativos tab payload). */
  byFundo: (fundoId: number) => ["documentos", "fundo", fundoId] as const,
  /** Flat documento list of the Gestora (the Gestora Documentos tab payload). */
  byGestora: (gestoraId: string) => ["documentos", "gestora", gestoraId] as const,
};

export const classificacaoKeys = {
  /** All classificação queries (broad invalidation root). */
  all: ["classificacoes"] as const,
  /** The catalog list, with its default documentos nested. */
  list: (includeInactive?: boolean) => ["classificacoes", "list", !!includeInactive] as const,
};
