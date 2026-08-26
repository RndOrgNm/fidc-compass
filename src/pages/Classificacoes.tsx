import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { classificacaoKeys } from "@/lib/queryKeys";
import { listClassificacoes } from "@/lib/api/classificacaoService";
import { ClassificacaoList } from "@/components/classificacoes/ClassificacaoList";

export default function Classificacoes() {
  const [includeInactive, setIncludeInactive] = useState(false);

  const query = useQuery({
    queryKey: classificacaoKeys.list(includeInactive),
    queryFn: () => listClassificacoes(includeInactive),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Classificações</h1>
            <p className="text-sm text-muted-foreground">
              Catálogo global de classificações de ativo e seus documentos padrão.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="include-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
            <Label htmlFor="include-inactive" className="text-sm font-normal">
              Mostrar inativas
            </Label>
          </div>
        </div>

        {query.isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : query.isError ? (
          <p className="text-sm text-destructive">Não foi possível carregar as classificações.</p>
        ) : (
          <ClassificacaoList items={query.data?.items ?? []} />
        )}
      </div>
    </AppLayout>
  );
}
