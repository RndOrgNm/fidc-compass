import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { CedentesTab } from "@/components/pipeline/cedentes/CedentesTab";
import { RecebiveisTab } from "@/components/pipeline/recebiveis/RecebiveisTab";

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
            <TabsList className="grid w-full grid-cols-2 max-w-2xl mb-6">
              <TabsTrigger value="cedentes">Gestão de Cedentes</TabsTrigger>
              <TabsTrigger value="recebiveis">Mesa de Operações</TabsTrigger>
            </TabsList>

            <TabsContent value="cedentes" className="mt-0">
              <CedentesTab />
            </TabsContent>

            <TabsContent value="recebiveis" className="mt-0">
              <RecebiveisTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
