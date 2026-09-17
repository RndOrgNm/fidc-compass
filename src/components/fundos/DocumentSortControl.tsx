import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentoOrderBy, OrderDir } from "@/lib/api/documentoService";

const ORDER_BY_LABELS: Record<DocumentoOrderBy, string> = {
  nome: "Nome",
  data_criacao: "Data de criação",
  status: "Status",
  cadencia: "Cadência",
};

export function DocumentSortControl({
  orderBy,
  orderDir,
  onChange,
}: {
  orderBy: DocumentoOrderBy | undefined;
  orderDir: OrderDir;
  onChange: (orderBy: DocumentoOrderBy | undefined, orderDir: OrderDir) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={orderBy ?? "padrao"}
        onValueChange={(v) => onChange(v === "padrao" ? undefined : (v as DocumentoOrderBy), orderDir)}
      >
        <SelectTrigger className="h-8 w-[168px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="padrao">Padrão (prazo mais próximo)</SelectItem>
          {(Object.keys(ORDER_BY_LABELS) as DocumentoOrderBy[]).map((k) => (
            <SelectItem key={k} value={k}>{ORDER_BY_LABELS[k]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        aria-label={orderDir === "asc" ? "Crescente" : "Decrescente"}
        title={orderDir === "asc" ? "Crescente" : "Decrescente"}
        onClick={() => onChange(orderBy, orderDir === "asc" ? "desc" : "asc")}
      >
        {orderDir === "asc" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
      </Button>
    </div>
  );
}
