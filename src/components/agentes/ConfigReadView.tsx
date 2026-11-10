import { useState } from "react";
import { Check, ChevronRight, Copy, Info, ShieldCheck } from "lucide-react";

import { FIXED_NOTE, ReadArea, Section } from "@/components/agentes/parts";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  EDITABLE_SKILL,
  contentOf,
  middlewareLabel,
  modelLabel,
  providerLabel,
  type AgentConfig,
  type VersionView,
} from "@/lib/agentConfig";
import { cn } from "@/lib/utils";

/** One version of the agent, read only: what the page edits first, then what it only shows. */
export function ConfigReadView({ config, view }: { config: AgentConfig; view: VersionView }) {
  const content = contentOf(view);
  const [skillOpen, setSkillOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(content.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // the text stays selectable in the box
    }
  }

  return (
    <div>
      <Section title="Modelo" first>
        <div className="flex flex-wrap items-baseline gap-2.5">
          <b className="text-base font-semibold">{modelLabel(content.provider, content.model, config.models)}</b>
          <span className="text-muted-foreground">{providerLabel(content.provider)}</span>
        </div>
      </Section>

      <Section
        title="Prompt"
        hint={`${content.prompt.split("\n").length} linhas · markdown`}
        action={
          <Button variant="outline" size="sm" onClick={copyPrompt}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        }
      >
        <ReadArea text={content.prompt} label="Texto do prompt" />
      </Section>

      {view.skill && (
        <Section title="Skills" hint="Instruções extras que o agente consulta quando precisa.">
          <Collapsible open={skillOpen} onOpenChange={setSkillOpen} className="rounded-lg border border-border/70 bg-card/50">
            <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-5 py-4 text-left hover:bg-accent/40">
              <ChevronRight className={cn("h-4 w-4 flex-none text-muted-foreground transition-transform", skillOpen && "rotate-90")} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{view.skill.name || EDITABLE_SKILL}</span>
                <span className="block text-[13px] text-muted-foreground">{view.skill.description}</span>
              </span>
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                {content.skill.split("\n").length} linhas
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-5 pb-5">
              <ReadArea text={content.skill} label={`Instruções da skill ${view.skill.name}`} tall />
            </CollapsibleContent>
          </Collapsible>
        </Section>
      )}

      <Section title="Servidores de ferramentas (MCPs)" hint="As conexões que o agente pode usar.">
        {config.mcps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum servidor.</p>
        ) : (
          <ul>
            {config.mcps.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-b border-border/40 py-3 last:border-b-0">
                <span className="flex-1 font-medium">{m.name}</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    m.active ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                  {m.active ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Proteções (middlewares)" hint="Regras que sempre valem durante a execução. Somente leitura.">
        <ul>
          {view.agent.middlewares.map((w, i) => (
            <li key={`${w.name}-${i}`} className="flex items-center gap-3 border-b border-border/40 py-3 last:border-b-0">
              <ShieldCheck className="h-4 w-4 flex-none text-primary dark:text-[hsl(14,59%,62%)]" aria-hidden />
              <span className="flex-1">{middlewareLabel(w.name)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex items-start gap-2.5 rounded-lg bg-muted/70 px-4 py-3.5 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
        <span>{FIXED_NOTE}</span>
      </div>
    </div>
  );
}
