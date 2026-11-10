import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Info, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ConfigReadView } from "@/components/agentes/ConfigReadView";
import { StatusBadge, formatDate } from "@/components/agentes/parts";
import { VersionsTable } from "@/components/agentes/VersionsTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { agentConfigsKey } from "@/hooks/useAgentConfigs";
import { saveDraft } from "@/lib/agentConfigActions";
import {
  contentOf,
  draftOf,
  nextVersionOf,
  publishedOf,
  publishedVersions,
  type AgentConfig,
} from "@/lib/agentConfig";

interface Props {
  config: AgentConfig;
  section: "uso" | "versoes";
  /** An earlier version being read, or null for the one in use. */
  version: number | null;
}

export function AgentDetail({ config, section, version }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [replacing, setReplacing] = useState(false);

  const published = publishedOf(config);
  const draft = draftOf(config);
  const base = `/agentes/${config.slug}`;
  const earlier = version !== null && version !== published?.agent.version;
  const shown = earlier ? publishedVersions(config).find((v) => v.agent.version === version) : published;

  const makeBase = useMutation({
    mutationFn: () => saveDraft(config, contentOf(shown!)),
    onSuccess: async () => {
      setReplacing(false);
      await queryClient.invalidateQueries({ queryKey: agentConfigsKey });
      toast({ title: `Rascunho v${nextVersionOf(config)} criado a partir da v${version}`, description: "Ainda não está em uso." });
      navigate(`${base}/editar`);
    },
    onError: () => {
      setReplacing(false);
      toast({ title: "Não foi possível criar o rascunho", description: "Tente de novo.", variant: "destructive" });
    },
  });

  if (!published || !shown) {
    return <p className="text-sm text-muted-foreground">Esta versão não existe.</p>;
  }

  return (
    <div>
      {earlier && (
        <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border bg-muted px-4 py-3">
          <span className="flex min-w-48 flex-1 items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 flex-none" aria-hidden />
            Você está vendo a v{version}, uma versão anterior.
          </span>
          <Button variant="outline" size="sm" disabled={makeBase.isPending} onClick={() => (draft ? setReplacing(true) : makeBase.mutate())}>
            Usar como base de um rascunho
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`${base}/versoes`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar às versões
            </Link>
          </Button>
        </div>
      )}

      <nav aria-label="Você está em" className="mb-5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
        <Link to="/agentes" className="hover:text-foreground hover:underline">
          Agentes
        </Link>
        <ChevronRight className="h-4 w-4" aria-hidden />
        <Link to={base} className="hover:text-foreground hover:underline">
          {config.name}
        </Link>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{config.name}</h1>
            {earlier ? (
              <StatusBadge tone="neutral">
                v{shown.agent.version} · criada em {formatDate(shown.agent.created_at)} · versão anterior
              </StatusBadge>
            ) : (
              <StatusBadge tone="ok" dot>
                v{published.agent.version} · em uso · criada em {formatDate(published.agent.created_at)}
              </StatusBadge>
            )}
          </div>
          <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{config.description}</p>
        </div>
        {!earlier && (
          <Button asChild>
            <Link to={`${base}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              {draft ? "Continuar rascunho" : "Editar"}
            </Link>
          </Button>
        )}
      </div>

      {!earlier && draft && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-[13px]">
          <Pencil className="h-4 w-4" aria-hidden />
          <span>
            Existe um rascunho v{draft.agent.version} em edição. Ele não está em uso: o agente continua na v
            {published.agent.version}.
          </span>
          <Link to={`${base}/editar`} className="font-medium text-primary hover:underline dark:text-[hsl(14,59%,62%)]">
            Continuar editando
          </Link>
        </div>
      )}

      <Tabs value={section} onValueChange={(next) => navigate(next === "versoes" ? `${base}/versoes` : base)}>
        <TabsList aria-label="Seções do agente">
          <TabsTrigger value="uso">{earlier ? `Configuração da v${version}` : "Configuração em uso"}</TabsTrigger>
          <TabsTrigger value="versoes">
            Versões
            <span className="ml-2 rounded-full bg-background/60 px-1.5 text-[11px] text-muted-foreground">
              {publishedVersions(config).length + (draft ? 1 : 0)}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-2">
        {section === "uso" ? <ConfigReadView config={config} view={shown} /> : <VersionsTable config={config} draft={draft} />}
      </div>

      <Dialog open={replacing} onOpenChange={(open) => !makeBase.isPending && setReplacing(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir o rascunho atual?</DialogTitle>
            <DialogDescription>
              Já existe um rascunho v{draft?.agent.version} em edição. Usar a v{version} como base apaga as edições dele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={makeBase.isPending} onClick={() => setReplacing(false)}>
              Cancelar
            </Button>
            <Button disabled={makeBase.isPending} onClick={() => makeBase.mutate()}>
              {makeBase.isPending ? "Substituindo…" : "Substituir rascunho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
