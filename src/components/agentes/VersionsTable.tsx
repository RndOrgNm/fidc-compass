import { ChevronRight, Lock } from "lucide-react";
import { Link } from "react-router-dom";

import { StatusBadge, formatDate } from "@/components/agentes/parts";
import { publishedOf, publishedVersions, type AgentConfig, type VersionView } from "@/lib/agentConfig";

/** Every version of the agent: a draft first, then the published ones, newest first. */
export function VersionsTable({ config, draft }: { config: AgentConfig; draft: VersionView | null }) {
  const inUse = publishedOf(config)?.agent.version;
  const published = publishedVersions(config);
  const showAuthor = config.versions.some((v) => v.agent.created_by);
  const base = `/agentes/${config.slug}`;
  const row = "grid items-center gap-3 border-t border-border/50 px-3 py-3 text-sm hover:bg-accent/40";
  const grid = showAuthor
    ? "grid-cols-[3.25rem_1fr_auto] sm:grid-cols-[4.5rem_1.5fr_1.3fr_1.2fr_1.5rem]"
    : "grid-cols-[3.25rem_1fr_auto] sm:grid-cols-[4.5rem_1.5fr_1.3fr_1.5rem]";

  return (
    <div className="mt-2">
      <div
        aria-hidden
        className={`hidden items-center gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground sm:grid ${grid}`}
      >
        <span>Versão</span>
        <span>Criada em</span>
        <span>Estado</span>
        {showAuthor && <span>Criada por</span>}
        <span />
      </div>
      <div className="border-b border-border/50">
        {draft && (
          <Link to={`${base}/editar`} className={`${row} ${grid}`} aria-label={`Continuar editando o rascunho v${draft.agent.version}`}>
            <span className="font-mono font-semibold">v{draft.agent.version}</span>
            <span>
              <div>{formatDate(draft.agent.created_at)}</div>
              <div className="text-xs text-muted-foreground">Ainda não publicada</div>
            </span>
            <span>
              <StatusBadge tone="draft">Rascunho</StatusBadge>
            </span>
            {showAuthor && <span className="hidden sm:block">{draft.agent.created_by ?? "—"}</span>}
            <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
          </Link>
        )}
        {published.map((v) => {
          const current = v.agent.version === inUse;
          return (
            <Link
              key={v.agent.version}
              to={current ? base : `${base}/versoes/${v.agent.version}`}
              className={`${row} ${grid}`}
              aria-label={`Abrir a v${v.agent.version}${current ? ", versão em uso" : ", somente leitura"}`}
            >
              <span className="font-mono font-semibold">v{v.agent.version}</span>
              <span>{formatDate(v.agent.created_at)}</span>
              <span>
                <StatusBadge tone={current ? "ok" : "neutral"}>{current ? "Publicada · em uso" : "Publicada"}</StatusBadge>
              </span>
              {showAuthor && <span className="hidden sm:block">{v.agent.created_by ?? "—"}</span>}
              <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
            </Link>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Lock className="h-4 w-4 flex-none" aria-hidden />
        Versões publicadas não podem ser editadas. Para mudar algo, crie um rascunho a partir de uma versão.
      </p>
    </div>
  );
}
