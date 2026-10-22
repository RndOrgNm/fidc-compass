import { Fragment } from "react";

import type { PropostaFonte } from "@/types/propostas";

const MARKER = /(\[\d+\])/;

/**
 * Renders the agent's reasoning with each `[n]` marker turned into a link to
 * source n (`fontes[n - 1]`). A marker with no matching source stays as plain
 * text, so a stray bracket never becomes a dead link.
 */
export function RaciocinioText({
  raciocinio,
  fontes,
  onOpenSource,
}: {
  raciocinio: string;
  fontes: PropostaFonte[];
  onOpenSource: (fonte: PropostaFonte) => void;
}) {
  return (
    <>
      {raciocinio.split(MARKER).map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        const fonte = match ? fontes[Number(match[1]) - 1] : undefined;
        if (!match || !fonte) return <Fragment key={i}>{part}</Fragment>;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Fonte ${match[1]}: ${fonte.trecho}`}
            onClick={() => onOpenSource(fonte)}
            className="mx-0.5 align-baseline font-medium text-primary underline-offset-2 hover:underline"
          >
            ({match[1]})
          </button>
        );
      })}
    </>
  );
}
