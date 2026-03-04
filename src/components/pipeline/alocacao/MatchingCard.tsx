import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Clock, AlertTriangle, GripVertical, FileText, Building2, Briefcase, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AllocationWorkflow } from "@/lib/api/allocationService";
import { isAllocationTerminal } from "@/data/allocationPipelineConfig";

interface MatchingCardProps {
  workflow: AllocationWorkflow;
  onOpenDetails?: (workflow: AllocationWorkflow) => void;
  onDelete?: (workflow: AllocationWorkflow) => void;
}

export function MatchingCard({ workflow, onOpenDetails, onDelete }: MatchingCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: workflow.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const formatCnpj = (cnpj: string) => {
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
    if (!workflow.total_steps) return 0;
    return Math.round((workflow.completed_steps / workflow.total_steps) * 100);
  };

  const getCurrentStepLabel = () => {
    const steps: Record<string, string> = {
      awaiting_selection: "Aguardando seleção",
      fund_evaluation: "Avaliação do fundo",
      compliance_verification: "Verificação compliance",
      final_approval: "Aprovação final",
      completed: "Concluído",
    };
    return steps[workflow.current_step] || workflow.current_step || "—";
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

  const getRiskBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-green-100 text-green-800">Score {score}</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Score {score}</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Score {score}</Badge>;
    }
  };

  const getStatusBorderClass = () => {
    switch (workflow.status) {
      case "pending_match":
        return "border-l-4 border-slate-500";
      case "fund_selection":
        return "border-l-4 border-blue-500";
      case "compliance_check":
        return "border-l-4 border-yellow-500";
      case "allocated":
        return "border-l-4 border-green-500";
      case "rejected":
        return "border-l-4 border-red-500";
      case "withdrawn":
        return "border-l-4 border-orange-500";
      case "superseded":
        return "border-l-4 border-gray-500";
      default:
        return "";
    }
  };

  const handleAssignToMe = () => {
    // TODO: wire to useAssignAllocation when available
  };

  const handleOpenWorkflow = () => {
    onOpenDetails?.(workflow);
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
        <div className="flex items-start justify-between gap-2">
          <div
            {...listeners}
            {...attributes}
            className="flex-1 min-w-0 cursor-move touch-none"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold truncate">{workflow.receivable_number ?? "—"}</span>
              </div>
            </div>
            <div className="text-lg font-bold text-primary">
              {formatCurrency(workflow.nominal_value)}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {workflow.risk_score > 0 && getRiskBadge(workflow.risk_score)}
            {isAllocationTerminal(workflow.status) && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(workflow)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors touch-auto cursor-pointer"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{workflow.cedente_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Cedente</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{workflow.debtor_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Sacado</p>
            </div>
          </div>
        </div>

        {workflow.fund_name && (
          <div className="p-2 bg-primary/10 rounded-md">
            <p className="text-xs text-muted-foreground">Fundo selecionado</p>
            <p className="text-sm font-medium">{workflow.fund_name}</p>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {workflow.completed_steps ?? 0} de {workflow.total_steps ?? 0} etapas
            </span>
            <span className="font-medium">{getProgressPercentage()}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        <div className="text-sm">
          <span className="text-muted-foreground">Etapa atual:</span>
          <div className="font-medium mt-1">{getCurrentStepLabel()}</div>
        </div>

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

        {workflow.pending_items && workflow.pending_items.length > 0 && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <button type="button" className="cursor-help">
                  <Badge className="bg-red-100 text-red-800 pointer-events-none">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {workflow.pending_items.length}{" "}
                    {workflow.pending_items.length === 1 ? "pendência" : "pendências"}
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <ul className="text-sm space-y-1">
                  {workflow.pending_items.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
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
          >
            Atribuir p/ Mim
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
