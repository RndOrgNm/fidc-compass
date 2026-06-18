import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, Users, CalendarClock, LineChart } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FundContextBar } from "@/components/fundos/FundContextBar";
import { ControleDeAtivosContent } from "@/components/fundos/ControleDeAtivosContent";
import { EmConstrucao } from "@/components/fundos/EmConstrucao";
import { PrazosContent } from "@/components/fundos/PrazosContent";
import { GraficosContent } from "@/components/fundos/GraficosContent";
import { useHomeMetrics } from "@/hooks/useHomeMetrics";
import type { HomeFundRow } from "@/types/homeDashboard";

function fundDisplayName(f: HomeFundRow): string {
  return (f.apelido?.trim() || f.nome).trim() || "—";
}

export default function Fundos() {
  const { data, loading } = useHomeMetrics();
  const [searchParams] = useSearchParams();

  const funds = useMemo(() => {
    if (!data?.fundos?.length) return [];
    return [...data.fundos].sort((a, b) => b.plAtual - a.plAtual);
  }, [data?.fundos]);

  // Deep-link: ?fundo=<id_carteira>&tab=prazos (e.g. from the alerts bell).
  const deepLinkFund = Number(searchParams.get("fundo")) || null;
  const deepLinkTab = searchParams.get("tab") ?? "prazos";

  const [selectedId, setSelectedId] = useState<number | null>(deepLinkFund);
  const [tab, setTab] = useState<string>(deepLinkTab);

  const resolvedId = selectedId ?? funds[0]?.idCarteira ?? null;
  const selectedFund = funds.find((f) => f.idCarteira === resolvedId) ?? funds[0] ?? null;
  const selectedFundName = selectedFund ? fundDisplayName(selectedFund) : undefined;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl py-2">
        <FundContextBar
          funds={funds}
          loading={loading}
          selectedId={resolvedId}
          onSelect={setSelectedId}
        />

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="prazos"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <CalendarClock className="h-4 w-4" />
              Prazos
            </TabsTrigger>
            <TabsTrigger
              value="cotistas"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <Users className="h-4 w-4" />
              Cotistas
            </TabsTrigger>
            <TabsTrigger
              value="graficos"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <LineChart className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger
              value="controle"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <FileText className="h-4 w-4" />
              Controle de Ativos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controle" className="mt-8">
            <ControleDeAtivosContent fundName={selectedFundName} />
          </TabsContent>

          <TabsContent value="cotistas" className="mt-8">
            <EmConstrucao title="Cotistas" />
          </TabsContent>

          <TabsContent value="prazos" className="mt-8">
            <PrazosContent fundoId={resolvedId} fundName={selectedFundName} />
          </TabsContent>

          <TabsContent value="graficos" className="mt-8">
            <GraficosContent fundName={selectedFundName} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
