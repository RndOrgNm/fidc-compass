import { DndContext, DragEndEvent, closestCorners, useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { RecebiveisCard } from "./RecebiveisCard";
import { toast } from "@/hooks/use-toast";
import { useTransitionWorkflow } from "@/hooks/useProspection";
import { cn } from "@/lib/utils";
import type { ProspectionWorkflow, RecebivelStatus } from "@/lib/api/prospectionService";
import { RECEBIVEIS_COLUMNS, RECEBIVEIS_STATUSES_WITH_VALUE, RECEBIVEIS_TERMINAL_STATUSES } from "@/data/recebiveisPipelineConfig";

interface RecebiveisKanbanProps {
  workflows: ProspectionWorkflow[];
  checklist: Record<string, string[]>;
  onOpenDetails?: (workflow: ProspectionWorkflow) => void;
  onDelete?: (workflow: ProspectionWorkflow) => void;
}

const STATUS_ORDER: RecebivelStatus[] = RECEBIVEIS_COLUMNS.map((c) => c.id);

// ── Droppable column ───────────────────────────────────────────────────────────

interface KanbanColumnProps {
  id: RecebivelStatus;
  title: string;
  color: string;
  workflows: ProspectionWorkflow[];
  totalValue: string | null;
  checklist: Record<string, string[]>;
  onOpenDetails?: (workflow: ProspectionWorkflow) => void;
  onDelete?: (workflow: ProspectionWorkflow) => void;
}

function KanbanColumn({ id, title, color, workflows, totalValue, checklist, onOpenDetails, onDelete }: KanbanColumnProps) {
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
        {totalValue != null && <p className="text-xs text-muted-foreground">{totalValue}</p>}
      </div>
      <div className="space-y-3">
        {workflows.map((workflow) => (
          <RecebiveisCard key={workflow.id} workflow={workflow} checklist={checklist} onOpenDetails={onOpenDetails} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ── Kanban board ───────────────────────────────────────────────────────────────

export function RecebiveisKanban({ workflows, checklist, onOpenDetails, onDelete }: RecebiveisKanbanProps) {
  const transitionMutation = useTransitionWorkflow();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const workflowId = active.id as string;
    const targetColumnId = over.id as RecebivelStatus;

    const draggedWorkflow = workflows.find((wf) => wf.id === workflowId);
    if (!draggedWorkflow || draggedWorkflow.status === targetColumnId) return;

    const currentIdx = STATUS_ORDER.indexOf(draggedWorkflow.status);
    const targetIdx = STATUS_ORDER.indexOf(targetColumnId);
    const isMovingForward = targetIdx > currentIdx;
    const hasPending = (draggedWorkflow.pending_items?.length ?? 0) > 0;
    const isTerminalTarget = RECEBIVEIS_TERMINAL_STATUSES.includes(targetColumnId);

    if (isMovingForward && hasPending && !isTerminalTarget) {
      toast({
        title: "Itens pendentes",
        description: "Complete os itens pendentes antes de avançar para a próxima etapa.",
        variant: "destructive",
      });
      return;
    }

    transitionMutation.mutate(
      { workflowId, data: { status: targetColumnId } },
      {
        onSuccess: () => {
          const columnTitle =
            RECEBIVEIS_COLUMNS.find((c) => c.id === targetColumnId)?.title || targetColumnId;
          toast({
            title: "Workflow movido",
            description: `Workflow movido para ${columnTitle}`,
          });
        },
        onError: (error) => {
          toast({
            title: "Erro ao mover workflow",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const getWorkflowsByStatus = (status: RecebivelStatus) => {
    return workflows.filter((wf) => wf.status === status);
  };

  const getTotalValue = (status: RecebivelStatus) => {
    return getWorkflowsByStatus(status).reduce(
      (acc, wf) => acc + (wf.receivable_value ?? wf.nominal_value ?? 0),
      0
    );
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {RECEBIVEIS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            workflows={getWorkflowsByStatus(column.id)}
            totalValue={RECEBIVEIS_STATUSES_WITH_VALUE.includes(column.id) ? formatCurrency(getTotalValue(column.id)) : null}
            checklist={checklist}
            onOpenDetails={onOpenDetails}
            onDelete={onDelete}
          />
        ))}
      </div>
    </DndContext>
  );
}
