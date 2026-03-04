import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Building2, Briefcase, AlertTriangle } from "lucide-react";
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

interface AlocacaoDeleteModalProps {
  workflow: AllocationWorkflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (workflow: AllocationWorkflow) => void;
  isDeleting?: boolean;
}

export function AlocacaoDeleteModal({
  workflow,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: AlocacaoDeleteModalProps) {
  if (!workflow) return null;

  const handleConfirm = () => {
    onConfirm(workflow);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir alocação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta alocação? Esta ação não pode ser desfeita.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {workflow.receivable_number ?? "Recebível"} — {formatCurrency(workflow.nominal_value)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {ALLOCATION_STATUS_LABELS[workflow.status] ?? workflow.status}
              </Badge>
              {workflow.fund_name && (
                <Badge variant="outline">{workflow.fund_name}</Badge>
              )}
              {workflow.assigned_to && (
                <Badge variant="outline">Atribuído a: {workflow.assigned_to}</Badge>
              )}
            </div>
            <div className="grid gap-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Cedente: {workflow.cedente_name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                <span>Sacado: {workflow.debtor_name ?? "—"}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
