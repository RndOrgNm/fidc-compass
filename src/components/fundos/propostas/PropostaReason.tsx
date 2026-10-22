import { Sparkles } from "lucide-react";

import { RaciocinioText } from "@/components/fundos/propostas/RaciocinioText";
import type { PropostaFonte } from "@/types/propostas";

/**
 * Agent reasoning shown above a pending proposal (a `DocumentTable` or `PrazoItem`
 * row). The `[n]` markers in the text are the only way into the sources: each one
 * opens the cited source via `onOpenSource`.
 */
export function PropostaReason({
  raciocinio,
  fontes,
  onOpenSource,
}: {
  raciocinio: string;
  fontes: PropostaFonte[];
  onOpenSource: (fonte: PropostaFonte) => void;
}) {
  return (
    <div className="mb-3 px-0.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Sparkles className="h-3 w-3" /> Raciocínio do agente
      </div>
      <p className="max-w-[80ch] text-[13px] leading-relaxed text-foreground">
        <RaciocinioText raciocinio={raciocinio} fontes={fontes} onOpenSource={onOpenSource} />
      </p>
    </div>
  );
}
