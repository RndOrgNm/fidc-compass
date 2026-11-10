import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ChevronRight, GitCompare, Info, Loader2, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { DiffView } from "@/components/agentes/DiffView";
import { FIXED_NOTE, StatusBadge } from "@/components/agentes/parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { agentConfigsKey } from "@/hooks/useAgentConfigs";
import { discardDraft, publishDraft, saveDraft } from "@/lib/agentConfigActions";
import {
  contentOf,
  countText,
  diffLines,
  diffSummary,
  draftOf,
  middlewareLabel,
  modelKey,
  modelLabel,
  modelOptionsFor,
  nextVersionOf,
  providerLabel,
  publishedOf,
  sameContent,
  type AgentConfig,
  type ConfigContent,
} from "@/lib/agentConfig";
import { ApiRequestError } from "@/lib/api/threadsService";
import { cn } from "@/lib/utils";

type Dialogs = "publish" | "discard" | "leave" | null;

function publishErrorText(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) return `${error.detail} Revise as mudanças e publique de novo.`;
    if (error.status === 422) return `O registro recusou a publicação: ${error.detail}`;
  }
  return "Não foi possível publicar. Tente de novo.";
}

function Alert({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mt-4 flex flex-wrap items-center gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
        tone === "error" ? "border-red-400/55 bg-red-400/10" : "bg-muted",
      )}
    >
      {tone === "error" ? <AlertCircle className="h-4 w-4 flex-none text-red-700 dark:text-red-300" aria-hidden /> : <Info className="h-4 w-4 flex-none text-muted-foreground" aria-hidden />}
      {children}
    </div>
  );
}

export function AgentEditor({ config }: { config: AgentConfig }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const published = publishedOf(config)!;
  const latest = config.versions.at(-1)!;
  const draft = draftOf(config);
  const base = `/agentes/${config.slug}`;
  const inUse = contentOf(published);
  const hasSkill = Boolean(latest.skill);
  const next = nextVersionOf(config);

  const [startedFrom] = useState(published.agent.version);
  const [local, setLocal] = useState<ConfigContent>(() => contentOf(draft ?? published));
  const [showDiff, setShowDiff] = useState(false);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [dialogError, setDialogError] = useState("");

  const dirty = !sameContent(local, contentOf(latest));
  const changedFromUse = !sameContent(local, inUse);
  const modelChanged = local.provider !== inUse.provider || local.model !== inUse.model;
  const promptDiff = useMemo(() => diffLines(inUse.prompt, local.prompt), [inUse.prompt, local.prompt]);
  const skillDiff = useMemo(() => diffLines(inUse.skill, local.skill), [inUse.skill, local.skill]);
  const emptyPrompt = local.prompt.trim() === "";
  const emptySkill = hasSkill && local.skill.trim() === "";
  const canPublish = !emptyPrompt && !emptySkill && changedFromUse;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: agentConfigsKey });

  const save = useMutation({
    mutationFn: () => saveDraft(config, local),
    onSuccess: refresh,
  });

  const publish = useMutation({
    mutationFn: () => publishDraft(config, local, next),
    onSuccess: async (agent) => {
      await refresh();
      setDialog(null);
      toast({ title: `v${agent.version} publicada`, description: "Vale a partir da próxima execução do agente." });
      navigate(base);
    },
    onError: (error) => setDialogError(publishErrorText(error)),
  });

  const discard = useMutation({
    mutationFn: async () => {
      if (draft) await discardDraft(config);
    },
    onSuccess: async () => {
      await refresh();
      setDialog(null);
      toast({ title: "Rascunho descartado", description: `A v${published.agent.version} continua em uso.` });
      navigate(base);
    },
    onError: () => setDialogError("Não foi possível descartar. Tente de novo."),
  });

  const busy = save.isPending || publish.isPending || discard.isPending;
  const set = (changes: Partial<ConfigContent>) => {
    setLocal((current) => ({ ...current, ...changes }));
    if (save.isError) save.reset();
  };

  const status = save.isPending
    ? "Salvando…"
    : save.isError
      ? "Não salvo"
      : dirty
        ? "Alterações não salvas"
        : draft
          ? "Rascunho salvo"
          : `Sem alterações em relação à v${published.agent.version}`;

  function open(kind: Dialogs) {
    setDialogError("");
    setDialog(kind);
  }

  const options = modelOptionsFor(local.provider, local.model, config.models);
  const labelOf = (c: ConfigContent) => modelLabel(c.provider, c.model, config.models);

  return (
    <div>
      <nav aria-label="Você está em" className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link to="/agentes" className="hover:text-foreground hover:underline">
          Agentes
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <Link to={base} className="hover:text-foreground hover:underline">
          {config.name}
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <span>Editando</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Editando {config.name}</h1>
        <StatusBadge tone="draft">
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          Rascunho · não está em uso
        </StatusBadge>
      </div>
      <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
        Salvar guarda o rascunho e não muda nada no agente em uso. A v{published.agent.version} continua rodando até você publicar.
      </p>

      <div className="sticky top-16 z-10 -mx-6 mb-2 mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background px-6 py-3">
        <div role="status" className="flex min-h-6 items-center gap-2 text-[13px] text-muted-foreground">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          <span>{status}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => (dirty ? open("leave") : navigate(base))}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Sair da edição
          </Button>
          <Button variant="outline" onClick={() => setShowDiff((v) => !v)}>
            <GitCompare className="mr-2 h-4 w-4" />
            {showDiff ? "Voltar à edição" : "Mostrar mudanças"}
            <span className="ml-2 rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
              {promptDiff.added || promptDiff.removed || skillDiff.added || skillDiff.removed
                ? `+${promptDiff.added + skillDiff.added} −${promptDiff.removed + skillDiff.removed}`
                : modelChanged
                  ? "modelo"
                  : "0"}
            </span>
          </Button>
          <Button variant="ghost" className="text-red-700 dark:text-red-300" disabled={busy || !(draft || changedFromUse)} onClick={() => open("discard")}>
            Descartar rascunho
          </Button>
          <Button variant="outline" disabled={busy || !dirty} onClick={() => save.mutate()}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
          <Button
            disabled={busy || !canPublish}
            title={canPublish ? `Publicar o rascunho como v${next}` : changedFromUse ? "Preencha o prompt e a skill para publicar" : "Não há mudanças para publicar"}
            onClick={() => open("publish")}
          >
            Publicar v{next}
          </Button>
        </div>
      </div>

      <div>
        {save.isError && (
          <Alert>
            <span className="min-w-40 flex-1">Não foi possível salvar. Tente de novo.</span>
            <Button variant="outline" size="sm" onClick={() => save.mutate()}>
              Tentar de novo
            </Button>
          </Alert>
        )}
        {(emptyPrompt || emptySkill) && (
          <Alert>
            <span className="min-w-40 flex-1">Prompt e skill não podem ficar vazios para publicar. Você ainda pode salvar o rascunho.</span>
          </Alert>
        )}
        {published.agent.version > startedFrom && (
          <Alert tone="info">
            <span className="min-w-40 flex-1">
              A v{published.agent.version} foi publicada enquanto você editava, então confira as mudanças antes de publicar.
            </span>
          </Alert>
        )}
      </div>

      {showDiff ? (
        <DiffView inUse={inUse} draft={local} models={config.models} inUseVersion={published.agent.version} draftVersion={next} hasSkill={hasSkill} />
      ) : (
        <div>
          <div className="py-6">
            <label htmlFor="f-model" className="mb-1 block text-sm font-semibold">
              Modelo
            </label>
            <p className="mb-2.5 text-[13px] text-muted-foreground">Em uso hoje: {labelOf(inUse)}.</p>
            <Select
              value={modelKey(local.provider, local.model)}
              onValueChange={(key) => {
                const chosen = options.find((o) => modelKey(o.provider, o.model) === key);
                if (chosen) set({ provider: chosen.provider, model: chosen.model });
              }}
            >
              <SelectTrigger id="f-model" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={modelKey(o.provider, o.model)} value={modelKey(o.provider, o.model)}>
                    {o.label} · {providerLabel(o.provider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="py-6">
            <label htmlFor="f-prompt" className="mb-1 block text-sm font-semibold">
              Prompt
            </label>
            <p className="mb-2.5 text-[13px] text-muted-foreground">O texto principal que orienta o agente. Aceita markdown.</p>
            <Textarea
              id="f-prompt"
              rows={14}
              spellCheck={false}
              value={local.prompt}
              onChange={(e) => set({ prompt: e.target.value })}
              className={cn("min-h-64 resize-y p-4 font-mono text-[13px] leading-relaxed", emptyPrompt && "border-red-400")}
            />
            <div className="mt-1.5 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
              <span className="font-medium text-red-700 dark:text-red-300">{emptyPrompt ? "O prompt não pode ficar vazio para publicar." : ""}</span>
              <span>{countText(local.prompt)}</span>
            </div>
          </div>

          {hasSkill && (
            <div className="py-6">
              <label htmlFor="f-skill" className="mb-1 block text-sm font-semibold">
                Instruções da skill Obrigações
              </label>
              <p className="mb-2.5 text-[13px] text-muted-foreground">Como o agente deve padronizar cada obrigação proposta. Aceita markdown.</p>
              <Textarea
                id="f-skill"
                rows={22}
                spellCheck={false}
                value={local.skill}
                onChange={(e) => set({ skill: e.target.value })}
                className={cn("min-h-[26rem] resize-y p-4 font-mono text-[13px] leading-relaxed", emptySkill && "border-red-400")}
              />
              <div className="mt-1.5 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-red-700 dark:text-red-300">{emptySkill ? "As instruções da skill não podem ficar vazias para publicar." : ""}</span>
                <span>{countText(local.skill)}</span>
              </div>
            </div>
          )}

          <div className="mt-2 border-t border-border/50 pt-6">
            <h3 className="text-sm font-semibold">Somente leitura</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">O que não muda nesta tela.</p>
            <div className="my-2.5 mb-4 flex flex-wrap gap-2">
              {config.mcps.map((m) => (
                <span key={m.id} className="inline-flex min-h-7 items-center rounded-full border border-border/70 px-3 text-xs text-muted-foreground">
                  {m.name} · {m.active ? "Ativo" : "Inativo"}
                </span>
              ))}
              <span
                className="inline-flex min-h-7 items-center rounded-full border border-border/70 px-3 text-xs text-muted-foreground"
                title={latest.agent.middlewares.map((w) => middlewareLabel(w.name)).join("\n")}
              >
                {latest.agent.middlewares.length} proteções
              </span>
              {latest.agent.output_schema && (
                <span className="inline-flex min-h-7 items-center rounded-full border border-border/70 px-3 text-xs text-muted-foreground">
                  Schema de saída
                </span>
              )}
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-muted/70 px-4 py-3.5 text-[13px] text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden />
              <span>{FIXED_NOTE}</span>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialog === "publish"} onOpenChange={(o) => !busy && setDialog(o ? "publish" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar a v{next}?</DialogTitle>
            <DialogDescription>
              A v{next} passa a ser a versão em uso. Execuções em andamento continuam com a v{published.agent.version}.
            </DialogDescription>
          </DialogHeader>
          {dirty && <Alert tone="info">Inclui alterações que ainda não foram salvas no rascunho.</Alert>}
          <div className="rounded-lg border border-border/70 text-[13px]">
            <SummaryRow label="Modelo" value={modelChanged ? `${labelOf(inUse)} → ${labelOf(local)}` : "Sem mudança"} />
            <SummaryRow label="Prompt" value={diffSummary(promptDiff)} />
            {hasSkill && <SummaryRow label="Skill Obrigações" value={diffSummary(skillDiff)} />}
          </div>
          {dialogError && <Alert>{dialogError}</Alert>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              disabled={publish.isPending}
              onClick={() => {
                setDialog(null);
                setShowDiff(true);
              }}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Ver mudanças
            </Button>
            <Button variant="outline" disabled={publish.isPending} onClick={() => setDialog(null)}>
              Cancelar
            </Button>
            <Button disabled={publish.isPending} onClick={() => publish.mutate()}>
              {publish.isPending ? "Publicando…" : `Publicar v${next}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "leave"} onOpenChange={(o) => !busy && setDialog(o ? "leave" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair sem salvar?</DialogTitle>
            <DialogDescription>Você tem alterações que ainda não foram salvas no rascunho.</DialogDescription>
          </DialogHeader>
          {dialogError && <Alert>{dialogError}</Alert>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={save.isPending} onClick={() => setDialog(null)}>
              Continuar editando
            </Button>
            <Button variant="ghost" disabled={save.isPending} onClick={() => navigate(base)}>
              Sair sem salvar
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() =>
                save.mutate(undefined, {
                  onSuccess: () => navigate(base),
                  onError: () => setDialogError("Não foi possível salvar. Tente de novo."),
                })
              }
            >
              {save.isPending ? "Salvando…" : "Salvar e sair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "discard"} onOpenChange={(o) => !busy && setDialog(o ? "discard" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar o rascunho?</DialogTitle>
            <DialogDescription>
              Você volta para a v{published.agent.version}, que é a versão em uso. As edições do rascunho serão perdidas.
            </DialogDescription>
          </DialogHeader>
          {dialogError && <Alert>{dialogError}</Alert>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={discard.isPending} onClick={() => setDialog(null)}>
              Continuar editando
            </Button>
            <Button disabled={discard.isPending} onClick={() => discard.mutate()}>
              {discard.isPending ? "Descartando…" : "Descartar rascunho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/40 px-3.5 py-2.5 last:border-b-0">
      <span>{label}</span>
      <span className="text-right font-mono">{value}</span>
    </div>
  );
}
