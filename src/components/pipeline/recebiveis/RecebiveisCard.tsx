import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, AlertTriangle, GripVertical, Building2, DollarSign, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAssignWorkflow } from "@/hooks/useProspection";
import { toast } from "@/hooks/use-toast";
import type { ProspectionWorkflow } from "@/lib/api/prospectionService";
import { RECEBIVEIS_COLUMNS, isRecebivelTerminal } from "@/data/recebiveisPipelineConfig";

interface RecebiveisCardProps {
  workflow: ProspectionWorkflow;
  checklist: Record<string, string[]>;
  onOpenDetails?: (workflow: ProspectionWorkflow) => void;
  onDelete?: (workflow: ProspectionWorkflow) => void;
}

export function RecebiveisCard({ workflow, checklist, onOpenDetails, onDelete }: RecebiveisCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workflow.id,
  });

  const assignMutation = useAssignWorkflow();

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const formatCnpj = (cnpj: string) => {
    if (!cnpj) return "";
    if (cnpj.includes("/") || cnpj.includes(".")) return cnpj;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getProgressPercentage = () => {
    if (workflow.total_steps === 0) return 0;
    return Math.round((workflow.completed_steps / workflow.total_steps) * 100);
  };

  const getSLABadge = () => {
    if (!workflow.sla_deadline) return null;

    const now = new Date();
    const deadline = new Date(workflow.sla_deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 2) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <Clock className="h-3 w-3 mr-1" />
          {daysRemaining} dias
        </Badge>
      );
    } else if (daysRemaining >= 1) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-red-100 text-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Atrasado
        </Badge>
      );
    }
  };

  const getSegmentBadge = (segment: string | null) => {
    if (!segment) return null;
    const segments: Record<string, { label: string; className: string }> = {
      comercio: { label: "Comércio", className: "bg-blue-100 text-blue-800" },
      industria: { label: "Indústria", className: "bg-purple-100 text-purple-800" },
      servicos: { label: "Serviços", className: "bg-cyan-100 text-cyan-800" },
      agronegocio: { label: "Agro", className: "bg-green-100 text-green-800" },
      varejo: { label: "Varejo", className: "bg-orange-100 text-orange-800" },
      insumos: { label: "Insumos", className: "bg-amber-100 text-amber-800" },
    };
    const seg = segments[segment] || { label: segment, className: "bg-gray-100 text-gray-800" };
    return <Badge className={seg.className}>{seg.label}</Badge>;
  };

  const getStatusBorderClass = () => {
    const column = RECEBIVEIS_COLUMNS.find((c) => c.id === workflow.status);
    return column ? `border-l-4 ${column.color}` : "";
  };

  const handleAssignToMe = () => {
    // TODO: replace with actual logged-in user name
    const currentUser = "Usuário Atual";
    assignMutation.mutate(
      { workflowId: workflow.id, assignedTo: currentUser },
      {
        onSuccess: () => {
          toast({
            title: "Workflow atribuído",
            description: "Workflow atribuído com sucesso",
          });
        },
        onError: (error) => {
          toast({
            title: "Erro ao atribuir workflow",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleOpenWorkflow = () => {
    onOpenDetails?.(workflow);
  };

  const getCurrentStepLabel = () => {
    const steps: Record<string, string> = {
      initial_contact: "Contato inicial",
      proposal_sent: "Proposta enviada",
      document_collection: "Coleta de documentos",
      risk_assessment: "Avaliação de risco",
      committee_review: "Revisão do comitê",
      completed: "Concluído",
    };
    return steps[workflow.current_step] || workflow.current_step;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-move hover:shadow-lg transition-shadow",
        getStatusBorderClass(),
        isDragging && "opacity-50"
      )}
    >
      <CardHeader className="pb-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div
              {...listeners}
              {...attributes}
              className="flex items-center gap-2 min-w-0 cursor-move touch-none"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold truncate">
                {workflow.cedente_name || "Sem nome"}
              </span>
            </div>
            {isRecebivelTerminal(workflow.status) && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(workflow)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 touch-auto cursor-pointer"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {workflow.cedente_cnpj ? formatCnpj(workflow.cedente_cnpj) : "—"}
            </span>
          </div>
          {workflow.cedente_segment && (
            <div>{getSegmentBadge(workflow.cedente_segment)}</div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {workflow.estimated_volume > 0 && (
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Vol. estimado</span>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-sm">{formatCurrency(workflow.estimated_volume)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs">
          {workflow.assigned_to ? (
            <Badge variant="outline">{workflow.assigned_to}</Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50">
              Não atribuído
            </Badge>
          )}
          <Badge variant="outline">{workflow.days_in_progress} dias</Badge>
          {getSLABadge()}
        </div>

        {(workflow.pending_items?.length ?? 0) > 0 && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <button type="button" className="cursor-help">
                  <Badge className="bg-red-100 text-red-800 pointer-events-none">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {(checklist[workflow.status]?.length ?? 0) > 0
                      ? `${workflow.pending_items.length} de ${checklist[workflow.status]!.length}`
                      : `${workflow.pending_items.length} ${workflow.pending_items.length === 1 ? "pendência" : "pendências"}`}
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[320px]">
                <p className="font-medium mb-1.5">
                  Checklist — {workflow.pending_items.length} pendente{workflow.pending_items.length !== 1 ? "s" : ""} (bloqueia avanço)
                </p>
                <ul className="text-sm space-y-1.5">
                  {(checklist[workflow.status] ?? []).length > 0 ? (
                    (checklist[workflow.status] ?? []).map((item, idx) => {
                      const isPending = workflow.pending_items.includes(item);
                      return (
                        <li key={idx} className={cn("flex items-start gap-1.5", isPending ? "text-foreground" : "text-muted-foreground")}>
                          <span className={isPending ? "text-red-500 mt-0.5" : "text-green-600 mt-0.5"}>
                            {isPending ? "○" : "✓"}
                          </span>
                          <span>{item}</span>
                        </li>
                      );
                    })
                  ) : (
                    workflow.pending_items.map((item: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  )}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2 pt-3">
        <Button size="sm" className="w-full" onClick={handleOpenWorkflow}>
          Abrir Detalhes
        </Button>
        {!workflow.assigned_to && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleAssignToMe}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? "Atribuindo..." : "Atribuir p/ Mim"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
