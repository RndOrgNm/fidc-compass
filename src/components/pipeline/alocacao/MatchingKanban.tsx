import { DndContext, DragEndEvent, closestCorners, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { MatchingCard } from "./MatchingCard";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useTransitionAllocationWorkflow } from "@/hooks/useAllocation";
import type { AllocationWorkflow, AllocationStatus } from "@/lib/api/allocationService";
import { ALLOCATION_COLUMNS } from "@/data/allocationPipelineConfig";

interface MatchingKanbanProps {
  workflows: AllocationWorkflow[];
  onOpenDetails?: (workflow: AllocationWorkflow) => void;
  onDelete?: (workflow: AllocationWorkflow) => void;
}

const STATUS_ORDER: string[] = ALLOCATION_COLUMNS.map((c) => c.id);

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  workflows: AllocationWorkflow[];
  totalValue: string;
  onOpenDetails?: (workflow: AllocationWorkflow) => void;
  onDelete?: (workflow: AllocationWorkflow) => void;
}

function KanbanColumn({ id, title, color, workflows, totalValue, onOpenDetails, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "space-y-4 border-t-4 rounded-t-md bg-muted/30 p-4 min-h-[600px] min-w-[260px] w-[260px] flex-shrink-0 transition-colors",
        color,
        isOver && "bg-primary/10 ring-2 ring-primary/30"
      )}
    >
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary">{workflows.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{totalValue}</p>
      </div>
      <div className="space-y-3">
        {workflows.map((workflow) => (
          <MatchingCard key={workflow.id} workflow={workflow} onOpenDetails={onOpenDetails} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

export function MatchingKanban({ workflows, onOpenDetails, onDelete }: MatchingKanbanProps) {
  const transitionMutation = useTransitionAllocationWorkflow();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const workflowId = active.id as string;
    const targetColumnId = over.id as string;

    const draggedWorkflow = workflows.find((wf) => wf.id === workflowId);
    if (!draggedWorkflow || draggedWorkflow.status === targetColumnId) return;

    const currentIdx = STATUS_ORDER.indexOf(draggedWorkflow.status);
    const targetIdx = STATUS_ORDER.indexOf(targetColumnId);
    const isMovingForward = targetIdx > currentIdx;
    const hasPending = (draggedWorkflow.pending_items?.length ?? 0) > 0;

    if (isMovingForward && hasPending) {
      toast({
        title: "Itens pendentes",
        description: "Complete os itens pendentes antes de avançar para a próxima etapa.",
        variant: "destructive",
      });
      return;
    }

    transitionMutation.mutate(
      { workflowId, data: { status: targetColumnId as AllocationStatus } },
      {
        onSuccess: () => {
          const columnTitle = ALLOCATION_COLUMNS.find((c) => c.id === targetColumnId)?.title || targetColumnId;
          toast({
            title: "Workflow movido",
            description: `Recebível movido para ${columnTitle}`,
          });
        },
        onError: (err) => {
          toast({
            title: "Erro ao mover",
            description: err instanceof Error ? err.message : "Não foi possível mover o workflow",
            variant: "destructive",
          });
        },
      }
    );
  };

  const getWorkflowsByStatus = (status: string) => {
    return workflows.filter((wf) => wf.status === status);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTotalValue = (status: string) => {
    return getWorkflowsByStatus(status).reduce((acc, wf) => acc + (wf.nominal_value || 0), 0);
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {ALLOCATION_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            workflows={getWorkflowsByStatus(column.id)}
            totalValue={formatCurrency(getTotalValue(column.id))}
            onOpenDetails={onOpenDetails}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}

