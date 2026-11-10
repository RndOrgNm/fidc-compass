import { ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

import { ToolActivityCard } from "@/components/chat/ToolActivityCard";
import type { ChatStep } from "@/lib/agui/chatItems";

/**
 * What the Agent did before it answered: its notes and the tools it called, in order, behind one
 * line. Open while it works, closed once the answer is there; a click on the line keeps the choice.
 */
export function AgentSteps({ steps, answered }: { steps: ChatStep[]; answered: boolean }) {
  const [chosen, setChosen] = useState<boolean | null>(null);
  if (!steps.length) return null;

  const open = chosen ?? !answered;
  const tools = steps.filter((s) => s.kind === "tool").length;
  const working = !answered;
  const label = working
    ? "Trabalhando…"
    : tools
      ? `Usou ${tools} ${tools === 1 ? "ferramenta" : "ferramentas"}`
      : "Passos";

  return (
    <div className="text-sm">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setChosen(!open)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        {working && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        <span>{label}</span>
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-l border-border pl-3">
          {steps.map((step) =>
            step.kind === "note" ? (
              <p key={step.id} className="text-muted-foreground">
                {step.text}
              </p>
            ) : (
              <ToolActivityCard key={step.call.id} items={[step.call]} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
