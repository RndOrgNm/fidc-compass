import { useParams, useNavigate } from "react-router-dom";
import { FileText, CalendarClock } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GestoraDocumentsContent } from "@/components/gestora/GestoraDocumentsContent";
import { GestoraPrazosContent } from "@/components/gestora/GestoraPrazosContent";

const VALID_TABS = ["documentos", "prazos"];

export default function Gestora() {
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const tab = VALID_TABS.includes(tabParam ?? "") ? tabParam! : "documentos";

  function handleTabChange(newTab: string) {
    navigate(newTab === "documentos" ? "/gestora" : `/gestora/${newTab}`, { replace: true });
  }

  return (
    <AppLayout title="Gestora">
      <div className="mx-auto max-w-5xl py-2">
        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="documentos"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="prazos"
              className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              <CalendarClock className="h-4 w-4" />
              Prazos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documentos" className="mt-8">
            <GestoraDocumentsContent />
          </TabsContent>

          <TabsContent value="prazos" className="mt-8">
            <GestoraPrazosContent />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
