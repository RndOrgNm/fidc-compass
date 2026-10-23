import { useCallback, useEffect, useRef, useState } from "react";

import { listDocumentosByFundo } from "@/lib/api/documentoService";
import { listObrigacoes } from "@/lib/api/prazoService";
import { documentoProposals, prazoProposals } from "@/lib/api/propostaMapper";
import type { DocumentoProposalEntry } from "@/components/fundos/propostas/PropostasContent";
import type { PropostaPrazo } from "@/types/propostas";

interface PropostasState {
  documentoProposals: DocumentoProposalEntry[];
  prazoProposals: PropostaPrazo[];
  loading: boolean;
  error: string | null;
}

interface UsePropostasResult extends PropostasState {
  /** Loads the proposals again, e.g. after one was edited. */
  reload: () => void;
}

export function usePropostas(fundoId: number | null): UsePropostasResult {
  const [state, setState] = useState<PropostasState>({
    documentoProposals: [],
    prazoProposals: [],
    loading: false,
    error: null,
  });
  const [reloads, setReloads] = useState(0);
  const reloading = useRef(false);
  const reload = useCallback(() => {
    reloading.current = true;
    setReloads((n) => n + 1);
  }, []);

  useEffect(() => {
    if (fundoId == null) return;
    let cancelled = false;
    // A reload keeps the cards on screen instead of flashing the loading state; changing
    // the fund still shows it.
    const isReload = reloading.current;
    reloading.current = false;
    setState((s) => ({ ...s, loading: !isReload, error: null }));
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
  }, [fundoId, reloads]);

  return { ...state, reload };
}
