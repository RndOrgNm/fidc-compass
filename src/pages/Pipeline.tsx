import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { CedentesTab } from "@/components/pipeline/cedentes/CedentesTab";
import { RecebiveisTab } from "@/components/pipeline/recebiveis/RecebiveisTab";

type PipelineTab = "cedentes" | "recebiveis";

export default function Pipeline() {
  const { cedenteId, workflowId } = useParams<{ cedenteId?: string; workflowId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive tab from path: /pipeline/cedentes* -> cedentes, /pipeline/recebiveis* -> recebiveis
  const tab: PipelineTab = location.pathname.includes("/recebiveis") ? "recebiveis" : "cedentes";

  // Redirect /pipeline (no subpath) to /pipeline/cedentes
  useEffect(() => {
    if (location.pathname === "/pipeline") {
      navigate("/pipeline/cedentes", { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (value: string) => {
    navigate(`/pipeline/${value}`);
  };

  const handleCedenteOpen = (id: string) => navigate(`/pipeline/cedentes/${id}`);
  const handleCedenteClose = () => navigate("/pipeline/cedentes");
  const handleWorkflowOpen = (id: string) => navigate(`/pipeline/recebiveis/${id}`);
  const handleWorkflowClose = () => navigate("/pipeline/recebiveis");

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mesa de Crédito</h1>
          <p className="text-muted-foreground">Esteira de Crédito e Operações</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-2xl mb-6">
                <TabsTrigger value="cedentes">Gestão de Cedentes</TabsTrigger>
                <TabsTrigger value="recebiveis">Mesa de Operações</TabsTrigger>
              </TabsList>

              <TabsContent value="cedentes" className="mt-0">
                <CedentesTab
                  selectedCedenteId={cedenteId ?? null}
                  onOpenDetails={handleCedenteOpen}
                  onCloseDetails={handleCedenteClose}
                />
              </TabsContent>

              <TabsContent value="recebiveis" className="mt-0">
                <RecebiveisTab
                  selectedWorkflowId={workflowId ?? null}
                  onOpenDetails={handleWorkflowOpen}
                  onCloseDetails={handleWorkflowClose}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
