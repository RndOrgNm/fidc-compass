import { useMemo, useState } from "react";

import { diffLines, modelLabel, type ConfigContent, type DiffRow, type ModelOption } from "@/lib/agentConfig";
import { cn } from "@/lib/utils";

/** "model", "prompt", or the id of a skill. */
type Item = string;

const ROW_STYLES: Record<DiffRow["kind"], string> = {
  same: "",
  add: "bg-emerald-500/15",
  del: "bg-red-400/15",
  gap: "bg-muted/80 italic text-muted-foreground",
};

const SIGN_STYLES: Record<DiffRow["kind"], string> = {
  same: "",
  add: "text-emerald-700 dark:text-emerald-400",
  del: "text-red-700 dark:text-red-300",
  gap: "",
};

function summary(added: number, removed: number): string {
  return added || removed ? `+${added} −${removed}` : "sem mudança";
}

/** What the draft changes in relation to the version in use: the model, and the two texts line by line. */
export function DiffView({
  inUse,
  draft,
  inUseVersion,
  draftVersion,
  skills,
  models,
}: {
  models: ModelOption[];
  inUse: ConfigContent;
  draft: ConfigContent;
  inUseVersion: number;
  draftVersion: number;
  /** The skills of the draft, by id, with the name the tab shows. */
  skills: { id: string; name: string }[];
}) {
  const [item, setItem] = useState<Item>("prompt");
  const prompt = useMemo(() => diffLines(inUse.prompt, draft.prompt), [inUse.prompt, draft.prompt]);
  const skillDiffs = useMemo(
    () => Object.fromEntries(skills.map((s) => [s.id, diffLines(inUse.skills[s.id] ?? "", draft.skills[s.id] ?? "")])),
    [skills, inUse.skills, draft.skills],
  );
  const modelChanged = inUse.provider !== draft.provider || inUse.model !== draft.model;

  const tabs: { id: Item; label: string; sum: string }[] = [
    { id: "model", label: "Modelo", sum: modelChanged ? "alterado" : "sem mudança" },
    { id: "prompt", label: "Prompt", sum: summary(prompt.added, prompt.removed) },
    ...skills.map((s) => ({
      id: s.id,
      label: `Skill ${s.name}`,
      sum: summary(skillDiffs[s.id].added, skillDiffs[s.id].removed),
    })),
  ];
  const diff = item === "prompt" ? prompt : skillDiffs[item] ?? prompt;

  return (
    <div>
      <h2 className="mt-5 text-base font-semibold">
        Mudanças do rascunho v{draftVersion} em relação à v{inUseVersion} (em uso)
      </h2>
      <div role="tablist" aria-label="Itens com mudanças" className="mb-4 mt-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={item === t.id}
            onClick={() => setItem(t.id)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-[13px] font-medium",
              item === t.id ? "border-primary/60 bg-muted" : "bg-background hover:bg-accent",
            )}
          >
            {t.label}
            <span className="font-mono text-xs text-muted-foreground">{t.sum}</span>
          </button>
        ))}
      </div>

      {item === "model" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn("rounded-lg border border-border/70 p-4", modelChanged && "bg-red-400/15")}>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Em uso (v{inUseVersion})</span>
            <b className="mt-1 block text-[15px]">{modelLabel(inUse.provider, inUse.model, models)}</b>
          </div>
          <div className={cn("rounded-lg border border-border/70 p-4", modelChanged && "bg-emerald-500/15")}>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rascunho (v{draftVersion})</span>
            <b className="mt-1 block text-[15px]">{modelLabel(draft.provider, draft.model, models)}</b>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>+ adicionado</span>
            <span>− removido</span>
            <span>Linhas sem mudança ficam recolhidas.</span>
          </div>
          <div tabIndex={0} aria-label="Diferenças linha a linha" className="overflow-auto rounded-lg border border-border/70 bg-card/50">
            {diff.rows.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "grid min-w-[26rem] grid-cols-[2.5rem_2.5rem_1.4rem_minmax(0,1fr)] font-mono text-[12.5px] leading-7",
                  ROW_STYLES[r.kind],
                )}
              >
                {r.kind === "gap" ? (
                  <span className="col-span-full px-3">··· {r.text}</span>
                ) : (
                  <>
                    <span className="select-none pr-2 text-right text-muted-foreground">{r.old}</span>
                    <span className="select-none pr-2 text-right text-muted-foreground">{r.next}</span>
                    <span className={cn("select-none text-center font-semibold", SIGN_STYLES[r.kind])}>
                      {r.kind === "add" ? "+" : r.kind === "del" ? "−" : ""}
                    </span>
                    <span className="whitespace-pre-wrap break-words pr-3">{r.text === "" ? " " : r.text}</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {diff.added === 0 && diff.removed === 0 && (
            <p className="mt-4 text-[13px] text-muted-foreground">Sem mudanças neste item em relação à v{inUseVersion}.</p>
          )}
        </>
      )}
    </div>
  );
}
