import { useEffect, useState } from "react";

import { listDocumentosByFundo } from "@/lib/api/documentoService";
import { listObrigacoes } from "@/lib/api/prazoService";
import { documentoProposals, prazoProposals } from "@/lib/api/propostaMapper";
import type { DocumentoProposalEntry } from "@/components/fundos/propostas/PropostasContent";
import type { PropostaPrazo } from "@/types/propostas";

interface UsePropostasResult {
  documentoProposals: DocumentoProposalEntry[];
  prazoProposals: PropostaPrazo[];
  loading: boolean;
  error: string | null;
}

export function usePropostas(fundoId: number | null): UsePropostasResult {
  const [state, setState] = useState<UsePropostasResult>({
    documentoProposals: [],
    prazoProposals: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (fundoId == null) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([listDocumentosByFundo(fundoId), listObrigacoes({ fundo_id: fundoId })])
      .then(([docs, obrigacoes]) => {
        if (cancelled) return;
        setState({
          documentoProposals: documentoProposals(docs),
          prazoProposals: prazoProposals(obrigacoes.items),
          loading: false,
          error: null,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          documentoProposals: [],
          prazoProposals: [],
          loading: false,
          error: e instanceof Error ? e.message : "Falha ao carregar propostas",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [fundoId]);

  return state;
}
