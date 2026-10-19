import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const REJECT_REASONS = ["Documento errado", "Período incorreto", "Ativo errado", "Arquivo incompleto"];

/**
 * Proposal rejection form — required reason (chips) + optional free-text
 * comment for the agent. `onConfirm` receives the chosen reason; the comment
 * stays out of the contract for now (no backend consumes it yet).
 */
export function PropostaRejectForm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (motivo: string) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <div className="mt-3.5 grid gap-2.5 rounded-lg border border-border bg-background p-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        Motivo da rejeição
      </div>
      <div className="flex flex-wrap gap-1.5">
        {REJECT_REASONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setReason(r)}
            className={cn(
              "inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent",
              reason === r && "border-border/80 bg-accent text-foreground",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Comentário para o agente (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-[60px] resize-y text-[13px]"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!reason}
          onClick={() => reason && onConfirm(reason)}
          className="text-destructive hover:text-destructive"
        >
          <X className="mr-1 h-4 w-4" /> Confirmar rejeição
        </Button>
      </div>
    </div>
  );
}
