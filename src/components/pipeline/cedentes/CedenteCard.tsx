import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { GripVertical, Building2, User, Trash2, ShieldCheck, Ban, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CedentePipelineStatus } from "@/data/pipelineData";
import { isCedenteTerminal } from "@/data/cedentesPipelineConfig";

export interface CedentePipelineItem {
  id: string;
  companyName: string;
  cnpj: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  segment: string;
  creditScore: number;
  status: CedentePipelineStatus;
  totalReceivables: number;
  approvedLimit: number;
  proposedLimit: number;
  createdAt: string;
  assigned_to: string | null;
  pending_items: string[];
  days_in_status: number;
}

interface CedenteCardProps {
  cedente: CedentePipelineItem;
  checklist: Record<string, string[]>;
  onOpenDetails?: (cedente: CedentePipelineItem) => void;
  onDelete?: (cedente: CedentePipelineItem) => void;
}

function formatCnpj(cnpj: string) {
  if (!cnpj) return "—";
  if (cnpj.includes("/") || cnpj.includes(".")) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const SEGMENT_LABELS: Record<string, string> = {
  comercio: "Comércio",
  industria: "Indústria",
  servicos: "Serviços",
  agronegocio: "Agronegócio",
  varejo: "Varejo",
  insumos: "Insumos",
};

const STATUS_BORDER: Record<CedentePipelineStatus, string> = {
  em_prospeccao: "border-l-4 border-slate-500",
  coleta_documentos: "border-l-4 border-amber-500",
  analise_credito: "border-l-4 border-blue-500",
  comite_credito: "border-l-4 border-purple-500",
  habilitado: "border-l-4 border-green-500",
  bloqueado_desistencia: "border-l-4 border-red-500",
};

function StatusBody({ cedente }: { cedente: CedentePipelineItem }) {
  switch (cedente.status) {
    case "em_prospeccao":
      return (
        <>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate">{cedente.contactName}</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {SEGMENT_LABELS[cedente.segment] ?? cedente.segment}
          </Badge>
          {cedente.proposedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite proposto: <span className="font-medium text-foreground">{formatCurrency(cedente.proposedLimit)}</span>
            </p>
          )}
        </>
      );

    case "coleta_documentos":
      return (
        <>
          <Badge variant="secondary" className="text-xs">
            {SEGMENT_LABELS[cedente.segment] ?? cedente.segment}
          </Badge>
          {cedente.proposedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite proposto: <span className="font-medium text-foreground">{formatCurrency(cedente.proposedLimit)}</span>
            </p>
          )}
        </>
      );

    case "analise_credito":
      return (
        <>
          <Badge variant="secondary" className="text-xs">
            {SEGMENT_LABELS[cedente.segment] ?? cedente.segment}
          </Badge>
          {cedente.creditScore > 0 && (
            <p className="text-xs text-muted-foreground">
              Score: <span className="font-medium text-foreground">{cedente.creditScore}</span>
            </p>
          )}
          {cedente.proposedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite proposto: <span className="font-medium text-foreground">{formatCurrency(cedente.proposedLimit)}</span>
            </p>
          )}
        </>
      );

    case "comite_credito":
      return (
        <>
          {cedente.creditScore > 0 && (
            <p className="text-xs text-muted-foreground">
              Score: <span className="font-medium text-foreground">{cedente.creditScore}</span>
            </p>
          )}
          {cedente.proposedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite proposto: <span className="font-medium text-foreground">{formatCurrency(cedente.proposedLimit)}</span>
            </p>
          )}
        </>
      );

    case "habilitado":
      return (
        <div className="space-y-1">
          {cedente.proposedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite proposto: <span className="font-medium text-foreground">{formatCurrency(cedente.proposedLimit)}</span>
            </p>
          )}
          {cedente.approvedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite aprovado: <span className="font-medium text-foreground">{formatCurrency(cedente.approvedLimit)}</span>
            </p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="font-medium">Cedente ativo</span>
          </div>
        </div>
      );

    case "bloqueado_desistencia":
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-red-700">
            <Ban className="h-3.5 w-3.5" />
            <span className="font-medium">Bloqueado / Desistência</span>
          </div>
          {cedente.proposedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite proposto: <span className="font-medium text-foreground">{formatCurrency(cedente.proposedLimit)}</span>
            </p>
          )}
          {cedente.approvedLimit > 0 && (
            <p className="text-xs text-muted-foreground">
              Limite aprovado: <span className="font-medium text-foreground">{formatCurrency(cedente.approvedLimit)}</span>
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

export function CedenteCard({ cedente, checklist, onOpenDetails, onDelete }: CedenteCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cedente.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const statusChecklist = checklist[cedente.status] ?? [];
  const totalChecklistItems = statusChecklist.length;
  const pendingCount = cedente.pending_items?.length ?? 0;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-move hover:shadow-lg transition-shadow",
        STATUS_BORDER[cedente.status] ?? "",
        isDragging && "opacity-50"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div
            {...listeners}
            {...attributes}
            className="flex items-center gap-2 min-w-0 cursor-move touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold truncate">{cedente.companyName}</span>
          </div>
          {isCedenteTerminal(cedente.status) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(cedente)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 touch-auto cursor-pointer"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span>{formatCnpj(cedente.cnpj)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <StatusBody cedente={cedente} />

        <div className="flex flex-wrap gap-2 text-xs pt-1">
          {cedente.assigned_to ? (
            <Badge variant="outline">{cedente.assigned_to}</Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50">
              Não atribuído
            </Badge>
          )}
          <Badge variant="outline">{cedente.days_in_status} dias</Badge>
          {totalChecklistItems > 0 && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <button type="button" className="cursor-help">
                    <Badge
                      className={cn(
                        "pointer-events-none",
                        pendingCount > 0 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {pendingCount > 0
                        ? `${pendingCount} de ${totalChecklistItems} pendente${
                            pendingCount !== 1 ? "s" : ""
                          }`
                        : "Checklist completo"}
                    </Badge>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[320px]">
                  <p className="font-medium mb-1.5">
                    Checklist — {pendingCount} pendente
                    {pendingCount !== 1 ? "s" : ""}
                  </p>
                  <ul className="text-sm space-y-1.5">
                    {statusChecklist.map((item, idx) => {
                      const isPending = cedente.pending_items.includes(item);
                      return (
                        <li
                          key={idx}
                          className={cn(
                            "flex items-start gap-1.5",
                            isPending ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          <span className={isPending ? "text-red-500 mt-0.5" : "text-green-600 mt-0.5"}>
                            {isPending ? "○" : "✓"}
                          </span>
                          <span>{item}</span>
                        </li>
                      );
                    })}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button size="sm" className="w-full" onClick={() => onOpenDetails?.(cedente)}>
          Abrir Detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}
