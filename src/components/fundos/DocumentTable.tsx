import {
  CalendarClock,
  CalendarPlus,
  Calendar as CalendarIcon,
  Eye,
  FolderX,
  SquarePen,
  Trash2,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { DOC_TYPES, DOC_STATUS, CADENCIA_LABELS, docLabel } from "@/data/ativosData";
import { usePagedList } from "@/hooks/usePagedList";
import { DocumentPager } from "@/components/fundos/DocumentPager";
import { DocumentSortableHeader } from "@/components/fundos/DocumentSortableHeader";
import type { PrazoPrefill } from "@/components/fundos/DocumentDialog";
import {
  type DocumentoResponse,
  type DocumentoOrderBy,
  type OrderDir,
} from "@/lib/api/documentoService";

const DOCS_PAGE_SIZE = 5;

function isoToBr(iso?: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return null;
  return `${d}/${m}/${y}`;
}

// ── Prazo cell ────────────────────────────────────────────────────────────────
function DocPrazoCell({
  doc,
  onCreatePrazo,
  onVerPrazo,
}: {
  doc: DocumentoResponse;
  onCreatePrazo: () => void;
  onVerPrazo: (obrigacaoId: string) => void;
}) {
  if (doc.prazo) {
    return (
      <button
        onClick={() => onVerPrazo(doc.prazo!.obrigacao_id)}
        title="Ver prazo na aba Prazos"
        className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12px] tabular-nums text-success transition-colors hover:text-success/80"
      >
        <CalendarClock className="h-3.5 w-3.5" /> {isoToBr(doc.prazo.data_vencimento)}
      </button>
    );
  }
  if (doc.status === "pendente") {
    return (
      <button
        onClick={onCreatePrazo}
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
      >
        <CalendarPlus className="h-3.5 w-3.5" /> Criar prazo
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted-foreground">
      <CalendarIcon className="h-3.5 w-3.5" /> Sem prazo vinculado
    </span>
  );
}

/**
 * Documento | Cadência | Referência | Última atualização | Status | Prazo |
 * Ações — a mesma tabela pra qualquer dono (Ativo/SPE, card do Fundo, ou
 * Gestora). Paginação por card/lista (não global), ordenação plugada no
 * `order_by`/`order_dir` real do backend.
 */
export function DocumentTable({
  docs,
  contextName,
  pageSize = DOCS_PAGE_SIZE,
  orderBy,
  orderDir,
  onSortChange,
  onView,
  onEdit,
  onDelete,
  onCreatePrazo,
  onVerPrazo,
  emptyMessage,
}: {
  docs: DocumentoResponse[];
  /** Nome curto do dono — prefixo do tópico ao criar um prazo a partir de uma linha. */
  contextName: string;
  pageSize?: number;
  orderBy: DocumentoOrderBy | undefined;
  orderDir: OrderDir;
  onSortChange: (orderBy: DocumentoOrderBy | undefined, orderDir: OrderDir) => void;
  onView: (doc: DocumentoResponse) => void;
  onEdit: (doc: DocumentoResponse) => void;
  onDelete: (doc: DocumentoResponse) => void;
  onCreatePrazo: (prefill: PrazoPrefill) => void;
  onVerPrazo: (obrigacaoId: string) => void;
  emptyMessage: string;
}) {
  const { page, setPage, totalPages, pageItems: pagedDocs } = usePagedList(docs, pageSize);

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <FolderX className="h-7 w-7 text-muted-foreground/60" />
        <p className="max-w-sm text-[13px] text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <DocumentSortableHeader
              field="nome" label="Documento" orderBy={orderBy} orderDir={orderDir} onChange={onSortChange}
              className="pb-2 pr-3 text-left font-medium"
            />
            <DocumentSortableHeader
              field="cadencia" label="Cadência" orderBy={orderBy} orderDir={orderDir} onChange={onSortChange}
              className="pb-2 px-3 text-left font-medium"
            />
            <th className="pb-2 px-3 text-left font-medium">Referência</th>
            <th className="pb-2 px-3 text-left font-medium">Última atualização</th>
            <DocumentSortableHeader
              field="status" label="Status" orderBy={orderBy} orderDir={orderDir} onChange={onSortChange}
              className="pb-2 px-3 text-left font-medium"
            />
            <DocumentSortableHeader
              field={undefined} label="Prazo" orderBy={orderBy} orderDir={orderDir} onChange={onSortChange}
              className="pb-2 px-3 text-left font-medium"
            />
            <th className="pb-2 pl-3 text-right font-medium">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pagedDocs.map((d) => {
            const meta = DOC_TYPES[d.tipo];
            const st = DOC_STATUS[d.status];
            const DocIcon = meta.icon;
            const StatusIcon = st.icon;
            const label = docLabel(d.tipo, d.nome_personalizado);
            return (
              <tr
                key={d.id}
                className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-card/40"
              >
                <td className="py-2.5 pr-3">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex w-fit cursor-help items-center gap-2 text-[13px] text-foreground">
                          <DocIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {label}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[280px]">
                        <p className="font-medium">{meta.label}</p>
                        <p className="text-muted-foreground">
                          {d.observacao?.trim() ? d.observacao : "Sem observação registrada."}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {CADENCIA_LABELS[d.cadencia]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.periodo_referencia || "—"}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {d.vigente_desde ? (
                    `vigente desde ${isoToBr(d.vigente_desde)}`
                  ) : (
                    <span className="italic text-muted-foreground/70">nenhum arquivo enviado</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10px] font-medium", st.chip)}>
                    <StatusIcon className="h-3 w-3" /> {st.label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <DocPrazoCell
                    doc={d}
                    onCreatePrazo={() =>
                      onCreatePrazo({
                        documentoId: d.id,
                        topico: `${label} — ${contextName}`,
                        resp: meta.resp,
                      })
                    }
                    onVerPrazo={onVerPrazo}
                  />
                </td>
                <td className="py-2.5 pl-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      aria-label="Ver documento"
                      onClick={() => onView(d)}
                      disabled={!d.arquivo_nome}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Editar campos"
                      onClick={() => onEdit(d)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <SquarePen className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Enviar novo"
                      onClick={() => onEdit(d)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Excluir"
                      onClick={() => onDelete(d)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <DocumentPager page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
