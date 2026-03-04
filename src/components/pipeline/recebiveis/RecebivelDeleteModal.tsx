import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import type { ProspectionWorkflow } from "@/lib/api/prospectionService";
import { RECEBIVEIS_STATUS_LABELS } from "@/data/recebiveisPipelineConfig";

const SEGMENT_LABELS: Record<string, string> = {
  comercio: "Comércio",
  industria: "Indústria",
  servicos: "Serviços",
  agronegocio: "Agronegócio",
  varejo: "Varejo",
  insumos: "Insumos",
};

function formatCnpj(cnpj: string | null) {
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

interface RecebivelDeleteModalProps {
  workflow: ProspectionWorkflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (workflow: ProspectionWorkflow) => void;
  isDeleting?: boolean;
}

export function RecebivelDeleteModal({
  workflow,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: RecebivelDeleteModalProps) {
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
            Excluir recebível
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este recebível? Esta ação não pode ser desfeita.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {workflow.cedente_name || "Sem nome"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {RECEBIVEIS_STATUS_LABELS[workflow.status as keyof typeof RECEBIVEIS_STATUS_LABELS] ?? workflow.status}
              </Badge>
              {workflow.cedente_segment && (
                <Badge variant="outline">{SEGMENT_LABELS[workflow.cedente_segment] ?? workflow.cedente_segment}</Badge>
              )}
              {workflow.assigned_to && (
                <Badge variant="outline">Atribuído a: {workflow.assigned_to}</Badge>
              )}
            </div>
            <div className="grid gap-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>CNPJ: {formatCnpj(workflow.cedente_cnpj)}</span>
              </div>
              {workflow.estimated_volume > 0 && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Volume estimado: {formatCurrency(workflow.estimated_volume)}</span>
                </div>
              )}
              {workflow.sla_deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>SLA: {new Date(workflow.sla_deadline).toLocaleDateString("pt-BR")}</span>
                </div>
              )}
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
