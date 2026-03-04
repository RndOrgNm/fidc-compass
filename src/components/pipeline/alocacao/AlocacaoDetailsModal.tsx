import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Building2,
  Briefcase,
  Banknote,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ALLOCATION_CHECKLIST } from "@/data/allocationChecklist";
import type { AllocationWorkflow } from "@/lib/api/allocationService";
import { ALLOCATION_STATUS_LABELS } from "@/data/allocationPipelineConfig";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface AlocacaoDetailsModalProps {
  workflow: AllocationWorkflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePendingItems: (workflowId: string, pendingItems: string[]) => void;
}

export function AlocacaoDetailsModal({
  workflow,
  open,
  onOpenChange,
  onUpdatePendingItems,
}: AlocacaoDetailsModalProps) {
  if (!workflow) return null;

  const checklistItems = ALLOCATION_CHECKLIST[workflow.status] ?? [];

  const handleCheckChange = (checkItem: string, checked: boolean) => {
    const current = workflow.pending_items ?? [];
    if (checked) {
      onUpdatePendingItems(workflow.id, current.filter((i) => i !== checkItem));
    } else {
      onUpdatePendingItems(workflow.id, [...current, checkItem]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {workflow.receivable_number ?? "Recebível"} — {formatCurrency(workflow.nominal_value)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 flex-1 min-h-0 flex flex-col">
          <div className="space-y-3 shrink-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{ALLOCATION_STATUS_LABELS[workflow.status] ?? workflow.status}</Badge>
              {workflow.fund_name && (
                <Badge variant="outline">{workflow.fund_name}</Badge>
              )}
              {workflow.assigned_to && (
                <Badge variant="outline">Atribuído a: {workflow.assigned_to}</Badge>
              )}
              <Badge variant="outline">{workflow.days_in_progress} dias no status</Badge>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatCurrency(workflow.nominal_value)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Cedente: {workflow.cedente_name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>Sacado: {workflow.debtor_name ?? "—"}</span>
              </div>
              {workflow.due_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Vencimento: {new Date(workflow.due_date).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
              {workflow.risk_score > 0 && (
                <div className="text-sm">Score de risco: {workflow.risk_score}</div>
              )}
            </div>
          </div>

          {checklistItems.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col gap-2">
              <h4 className="font-medium text-sm shrink-0">Checklist — {ALLOCATION_STATUS_LABELS[workflow.status] ?? workflow.status}</h4>
              <p className="text-xs text-muted-foreground shrink-0">
                Marque os itens concluídos. Quando todos estiverem concluídos, o workflow poderá avançar para o próximo status.
              </p>
              <ScrollArea className="flex-1 pr-3 -mr-2 border rounded-md p-4 min-h-[200px]">
                <div className="space-y-4">
                  {checklistItems.map((checkItem, idx) => {
                    const isChecked = !(workflow.pending_items ?? []).includes(checkItem);
                    return (
                      <div key={idx} className="flex items-start gap-3">
                        <Checkbox
                          id={`aloc-check-${workflow.id}-${idx}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCheckChange(checkItem, checked === true)
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <Label
                          htmlFor={`aloc-check-${workflow.id}-${idx}`}
                          className={cn(
                            "text-sm cursor-pointer leading-relaxed",
                            isChecked && "text-muted-foreground line-through"
                          )}
                        >
                          {checkItem}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {checklistItems.length === 0 && workflow.status === "allocated" && (
            <p className="text-sm text-muted-foreground">
              Alocação concluída. Sem checklist pendente.
            </p>
          )}

          {checklistItems.length === 0 &&
            (workflow.status === "rejected" ||
              workflow.status === "withdrawn" ||
              workflow.status === "superseded") && (
              <p className="text-sm text-muted-foreground">
                Workflow em status final.
              </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
