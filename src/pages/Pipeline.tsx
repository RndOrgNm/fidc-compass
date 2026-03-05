import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
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

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="cedentes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-3xl mb-6">
              <TabsTrigger value="cedentes">Gestão de Cedentes</TabsTrigger>
              <TabsTrigger value="recebiveis">Mesa de Operações</TabsTrigger>
              <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
            </TabsList>

            <TabsContent value="cedentes" className="mt-0">
              <CedentesTab />
            </TabsContent>

            <TabsContent value="recebiveis" className="mt-0">
              <RecebiveisTab />
            </TabsContent>

            <TabsContent value="monitoramento" className="mt-0">
              <MonitoramentoTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
