import { Bot, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBadge } from "@/components/agentes/parts";
import { draftOf, modelLabel, publishedOf, type AgentConfig } from "@/lib/agentConfig";

export function AgentList({ configs }: { configs: AgentConfig[] }) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold tracking-tight">Agentes</h1>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Veja e ajuste a configuração dos agentes de IA do Compass. Nada muda no agente em uso até você publicar.
        </p>
      </div>

      <div className="space-y-3">
        {configs.map((config) => {
          const published = publishedOf(config);
          if (!published) return null;
          const draft = draftOf(config);
          return (
            <Link
              key={config.id}
              to={`/agentes/${config.slug}`}
              aria-label={`Abrir o agente ${config.name}`}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-border/70 bg-card/50 p-5 hover:bg-accent/50"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-[hsl(14,59%,62%)]">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{config.name}</span>
                <span className="block text-sm text-muted-foreground">{config.description}</span>
                <span className="mt-1 flex gap-2 text-xs text-muted-foreground">
                  <span>{modelLabel(published.agent.provider, published.agent.model, config.models)}</span>
                  <span>·</span>
                  <span>Versão em uso: v{published.agent.version}</span>
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                {draft ? (
                  <>
                    <StatusBadge tone="draft" dot>
                      Rascunho em edição
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">Em uso: v{published.agent.version}</span>
                  </>
                ) : (
                  <StatusBadge tone="ok" dot>
                    Publicado · v{published.agent.version}
                  </StatusBadge>
                )}
              </span>
              <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-muted-foreground">
        Aparecem aqui os agentes liberados para configuração. Novos agentes entram quando forem liberados.
      </p>
    </div>
  );
}
