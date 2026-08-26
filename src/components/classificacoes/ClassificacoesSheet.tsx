import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { classificacaoKeys } from "@/lib/queryKeys";
import { listClassificacoes } from "@/lib/api/classificacaoService";
import { ClassificacaoList } from "./ClassificacaoList";

/** Manage Classificações — opened from a button on the Documentos page (Ativos tab). */
export function ClassificacoesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [includeInactive, setIncludeInactive] = useState(false);

  const query = useQuery({
    queryKey: classificacaoKeys.list(includeInactive),
    queryFn: () => listClassificacoes(includeInactive),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Classificações</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-end gap-2">
            <Switch id="cls-include-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
            <Label htmlFor="cls-include-inactive" className="text-sm font-normal">
              Mostrar inativas
            </Label>
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
      </SheetContent>
    </Sheet>
  );
}
