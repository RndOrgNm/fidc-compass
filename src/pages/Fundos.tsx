import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

const VALID_TABS = ["prazos", "cotistas", "graficos", "controle"];

function fundDisplayName(f: HomeFundRow): string {
  return (f.apelido?.trim() || f.nome).trim() || "—";
}

export default function Fundos() {
  const { data, loading } = useHomeMetrics();
  const { tab: tabParam, fundoId: fundoIdParam } = useParams<{ tab?: string; fundoId?: string }>();
  const navigate = useNavigate();

  const funds = useMemo(() => {
    if (!data?.fundos?.length) return [];
    return [...data.fundos].sort((a, b) => b.plAtual - a.plAtual);
  }, [data?.fundos]);

  const tab = VALID_TABS.includes(tabParam ?? "") ? tabParam! : "prazos";
  const urlFundoId = Number(fundoIdParam) || null;
  const resolvedId = urlFundoId ?? funds[0]?.idCarteira ?? null;
  const selectedFund = funds.find((f) => f.idCarteira === resolvedId) ?? funds[0] ?? null;
  const selectedFundName = selectedFund ? fundDisplayName(selectedFund) : undefined;

  function handleTabChange(newTab: string) {
    const id = resolvedId;
    if (id) navigate(`/fundos/${newTab}/${id}`, { replace: true });
    else navigate(`/fundos/${newTab}`, { replace: true });
  }

  function handleFundSelect(id: number | null) {
    const fundId = id ?? funds[0]?.idCarteira;
    if (fundId) navigate(`/fundos/${tab}/${fundId}`, { replace: true });
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl py-2">
        <FundContextBar
          funds={funds}
          loading={loading}
          selectedId={resolvedId}
          onSelect={handleFundSelect}
        />

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
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
