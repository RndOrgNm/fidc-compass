import { BookOpen, ExternalLink, Sparkles } from "lucide-react";

import { RaciocinioText } from "@/components/fundos/propostas/RaciocinioText";
import type { PropostaFonte } from "@/types/propostas";

function pageLabel(fonte: PropostaFonte): string | null {
  if (fonte.page == null) return null;
  return fonte.pageEnd && fonte.pageEnd !== fonte.page
    ? `Pág. ${fonte.page}–${fonte.pageEnd}`
    : `Pág. ${fonte.page}`;
}

/**
 * Agent reasoning block + clickable sources, shown above a pending proposal
 * (a `DocumentTable` or `PrazoItem` row). The `[n]` markers in the reasoning
 * and the source buttons below both open the cited source via `onOpenSource`.
 */
export function PropostaReason({
  raciocinio,
  fontes,
  arquivoNome,
  onOpenSource,
}: {
  raciocinio: string;
  fontes: PropostaFonte[];
  arquivoNome: string;
  onOpenSource: (fonte: PropostaFonte) => void;
}) {
  return (
    <div className="mb-3 px-0.5">
      <div className="mb-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Raciocínio do agente
        </div>
        <p className="max-w-[80ch] text-[13px] leading-relaxed text-foreground">
          <RaciocinioText raciocinio={raciocinio} fontes={fontes} onOpenSource={onOpenSource} />
        </p>
      </div>
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          <BookOpen className="h-3 w-3" /> Fontes · {arquivoNome}
        </div>
        <div className="flex flex-wrap gap-2">
          {fontes.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onOpenSource(f)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent"
            >
              <span className="font-mono text-[10.5px] text-muted-foreground">({i + 1})</span>
              <span className="max-w-[28ch] truncate">{f.trecho}</span>
              {pageLabel(f) && (
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                  {pageLabel(f)}
                </span>
              )}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
