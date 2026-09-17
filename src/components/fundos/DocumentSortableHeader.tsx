import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DocumentoOrderBy, OrderDir } from "@/lib/api/documentoService";

/**
 * A `<th>` whose label doubles as the sort control — click cycles
 * asc → desc → padrão (prazo mais próximo) for that column, replacing the
 * standalone `DocumentSortControl` dropdown.
 *
 * `field=undefined` represents the padrão itself (ex.: a coluna "Prazo") —
 * nesse caso o clique só alterna asc/desc, sem um 3º estado pra "resetar"
 * pra (já é o padrão).
 */
export function DocumentSortableHeader({
  field,
  label,
  orderBy,
  orderDir,
  onChange,
  className,
}: {
  field: DocumentoOrderBy | undefined;
  label: string;
  orderBy: DocumentoOrderBy | undefined;
  orderDir: OrderDir;
  onChange: (orderBy: DocumentoOrderBy | undefined, orderDir: OrderDir) => void;
  className?: string;
}) {
  const active = orderBy === field;

  function handleClick() {
    if (!active) onChange(field, "asc");
    else if (orderDir === "asc") onChange(field, "desc");
    else onChange(undefined, "asc"); // 3º clique (ou 2º, se field=undefined): volta pro padrão
  }

  return (
    <th className={className}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          orderDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}
