import { useParams } from "react-router-dom";

import { AgentDetail } from "@/components/agentes/AgentDetail";
import { AgentEditor } from "@/components/agentes/AgentEditor";
import { AgentList } from "@/components/agentes/AgentList";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentConfigs } from "@/hooks/useAgentConfigs";
import { publishedOf } from "@/lib/agentConfig";

function StateBox({ title, text, onRetry }: { title: string; text: string; onRetry?: () => void }) {
  return (
    <div className="max-w-prose py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div role="status" aria-label="Carregando os agentes">
      <Skeleton className="h-8 w-60" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <Skeleton className="mt-8 h-20 w-full" />
      <Skeleton className="mt-8 h-4 w-40" />
      <Skeleton className="mt-3 h-48 w-full" />
    </div>
  );
}

/** The configuration page of the agents: the list, one agent read, its versions, and its draft. */
export default function Agentes() {
  const { slug, section, version } = useParams<{ slug?: string; section?: string; version?: string }>();
  const { data: configs, isLoading, isError, refetch } = useAgentConfigs();

  let content;
  if (isLoading) {
    content = <Loading />;
  } else if (isError || !configs) {
    content = (
      <StateBox
        title="Não foi possível carregar"
        text="Os dados dos agentes não responderam. Verifique sua conexão e tente de novo."
        onRetry={() => refetch()}
      />
    );
  } else if (!slug) {
    content = <AgentList configs={configs} />;
  } else {
    const config = configs.find((c) => c.slug === slug);
    if (!config) {
      content = <StateBox title="Agente não encontrado" text="Este agente não está disponível para configuração." />;
    } else if (!publishedOf(config)) {
      content = (
        <StateBox title="Nenhuma configuração publicada" text={`O agente ${config.name} ainda não tem uma versão publicada neste ambiente.`} />
      );
    } else if (section === "editar") {
      content = <AgentEditor key={config.id} config={config} />;
    } else {
      const number = version ? Number(version) : null;
      content = <AgentDetail config={config} section={section === "versoes" && number === null ? "versoes" : "uso"} version={number} />;
    }
  }

  return (
    <AppLayout title="Agentes">
      <div className="mx-auto max-w-4xl py-2">{content}</div>
    </AppLayout>
  );
}
