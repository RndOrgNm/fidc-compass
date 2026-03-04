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
import { Building2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONITORAMENTO_CHECKLIST } from "@/data/monitoramentoChecklist";
import type { MonitoramentoPipelineItem } from "./MonitoramentoCard";
import type { MonitoramentoPipelineStatus } from "@/data/pipelineData";
import { MONITORAMENTO_STATUS_LABELS } from "@/data/monitoramentoPipelineConfig";

interface MonitoramentoDetailsModalProps {
  item: MonitoramentoPipelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePendingItems: (itemId: string, pendingItems: string[]) => void;
}

export function MonitoramentoDetailsModal({
  item,
  open,
  onOpenChange,
  onUpdatePendingItems,
}: MonitoramentoDetailsModalProps) {
  if (!item) return null;

  const checklistItems = MONITORAMENTO_CHECKLIST[item.status] ?? [];

  const handleCheckChange = (checkItem: string, checked: boolean) => {
    const current = item.pending_items ?? [];
    if (checked) {
      onUpdatePendingItems(item.id, current.filter((i) => i !== checkItem));
    } else {
      onUpdatePendingItems(item.id, [...current, checkItem]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {item.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 flex-1 min-h-0 flex flex-col">
          <div className="space-y-3 shrink-0">
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
              <span>Período de monitoramento: {item.period}</span>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <h4 className="font-medium text-sm shrink-0">Checklist — {MONITORAMENTO_STATUS_LABELS[item.status]}</h4>
            <p className="text-xs text-muted-foreground shrink-0">
              Marque os itens concluídos. Quando todos estiverem concluídos, o item poderá avançar para o próximo status.
            </p>
            <ScrollArea className="flex-1 pr-3 -mr-2 border rounded-md p-4 min-h-[200px]">
              <div className="space-y-4">
                {checklistItems.map((checkItem, idx) => {
                  const isChecked = !(item.pending_items ?? []).includes(checkItem);
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <Checkbox
                        id={`mon-check-${item.id}-${idx}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleCheckChange(checkItem, checked === true)
                        }
                        className="mt-0.5 shrink-0"
                      />
                      <Label
                        htmlFor={`mon-check-${item.id}-${idx}`}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
