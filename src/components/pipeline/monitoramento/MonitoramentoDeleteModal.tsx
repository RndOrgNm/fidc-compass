import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, AlertTriangle } from "lucide-react";
import type { MonitoramentoPipelineItem } from "./MonitoramentoCard";
import { MONITORAMENTO_STATUS_LABELS } from "@/data/monitoramentoPipelineConfig";

interface MonitoramentoDeleteModalProps {
  item: MonitoramentoPipelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: MonitoramentoPipelineItem) => void;
  isDeleting?: boolean;
}

export function MonitoramentoDeleteModal({
  item,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}: MonitoramentoDeleteModalProps) {
  if (!item) return null;

  const handleConfirm = () => {
    onConfirm(item);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir monitoramento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este monitoramento? Esta ação não pode ser desfeita.
          </p>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {item.title}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{MONITORAMENTO_STATUS_LABELS[item.status]}</Badge>
              {item.fundName && (
                <Badge variant="outline">{item.fundName}</Badge>
              )}
              <Badge variant="outline">{item.period}</Badge>
              {item.assigned_to && (
                <Badge variant="outline">Atribuído a: {item.assigned_to}</Badge>
              )}
              <Badge variant="outline">{item.days_in_status} dias no status</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Período: {item.period}</span>
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
