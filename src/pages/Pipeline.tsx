import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CedentesTab } from "@/components/pipeline/cedentes/CedentesTab";
import { RecebiveisTab } from "@/components/pipeline/recebiveis/RecebiveisTab";
import { MonitoramentoTab } from "@/components/pipeline/monitoramento/MonitoramentoTab";

export default function Pipeline() {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mesa de Crédito</h1>
        <p className="text-muted-foreground">Esteira de Crédito e Operações</p>
      </div>

      <Tabs defaultValue="cedentes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl">
          <TabsTrigger value="cedentes">Gestão de Cedentes</TabsTrigger>
          <TabsTrigger value="recebiveis">Mesa de Operações</TabsTrigger>
          <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="cedentes">
            <CedentesTab />
          </TabsContent>

          <TabsContent value="recebiveis">
            <RecebiveisTab />
          </TabsContent>

          <TabsContent value="monitoramento">
            <MonitoramentoTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
    </TooltipProvider>
  );
}
