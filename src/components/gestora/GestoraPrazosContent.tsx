import { useQuery } from "@tanstack/react-query";

import { listGestoras } from "@/lib/api/gestoraService";
import { PrazosContent } from "@/components/fundos/PrazosContent";

/** Thin wrapper: resolves the (single, seeded) Gestora, then renders the
 * generic `PrazosContent` scoped to it — same component the Fundos tab
 * uses, just with `owner={{ gestora_id }}` instead of `{ fundo_id }`. */
export function GestoraPrazosContent() {
  const gestorasQuery = useQuery({ queryKey: ["gestoras"], queryFn: listGestoras });
  const gestora = gestorasQuery.data?.items[0];

  if (gestorasQuery.isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  }
  if (!gestora) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma Gestora cadastrada.</div>;
  }

  return (
    <PrazosContent
      owner={{ gestora_id: gestora.id }}
      ownerName={gestora.nome}
      emptyOwnerMessage="Nenhuma Gestora cadastrada."
      emptyStateHint="da Gestora"
    />
  );
}
