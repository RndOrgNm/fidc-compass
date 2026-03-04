import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { GripVertical, AlertCircle, Building2, Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MonitoramentoPipelineStatus } from "@/data/pipelineData";
import { MONITORAMENTO_CHECKLIST } from "@/data/monitoramentoChecklist";
import { isMonitoramentoTerminal } from "@/data/monitoramentoPipelineConfig";

export interface MonitoramentoPipelineItem {
  id: string;
  title: string;
  fundName: string | null;
  period: string;
  status: MonitoramentoPipelineStatus;
  assigned_to: string | null;
  pending_items: string[];
  days_in_status: number;
}

interface MonitoramentoCardProps {
  item: MonitoramentoPipelineItem;
  onOpenDetails?: (item: MonitoramentoPipelineItem) => void;
  onDelete?: (item: MonitoramentoPipelineItem) => void;
}

export function MonitoramentoCard({ item, onOpenDetails, onDelete }: MonitoramentoCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const getStatusBorderClass = () => {
    switch (item.status) {
      case "alertas_deteccao":
        return "border-l-4 border-amber-500";
      case "correcoes_acoes":
        return "border-l-4 border-orange-500";
      case "relatorios_em_andamento":
        return "border-l-4 border-blue-500";
      case "em_conformidade_auditoria":
        return "border-l-4 border-purple-500";
      case "encerrado":
        return "border-l-4 border-green-500";
      default:
        return "";
    }
  };

  const handleOpenDetails = () => {
    onOpenDetails?.(item);
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
            className="flex items-center gap-2 min-w-0 cursor-move touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold truncate">{item.title}</span>
          </div>
          {isMonitoramentoTerminal(item.status) && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 touch-auto cursor-pointer"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        {item.fundName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{item.fundName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{item.period}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <div className="flex flex-wrap gap-2 text-xs pt-1">
          {item.assigned_to ? (
            <Badge variant="outline">{item.assigned_to}</Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-50">
              Não atribuído
            </Badge>
          )}
          <Badge variant="outline">{item.days_in_status} dias</Badge>
          {(item.pending_items?.length ?? 0) > 0 && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger>
                  <button type="button" className="cursor-help">
                    <Badge className="bg-red-100 text-red-800 pointer-events-none">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {item.pending_items.length} de {MONITORAMENTO_CHECKLIST[item.status]?.length ?? item.pending_items.length}
                    </Badge>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[320px]">
                  <p className="font-medium mb-1.5">
                    Checklist — {item.pending_items.length} pendente{item.pending_items.length !== 1 ? "s" : ""} (bloqueia avanço)
                  </p>
                  <ul className="text-sm space-y-1.5">
                    {(MONITORAMENTO_CHECKLIST[item.status] ?? []).map((checkItem, idx) => {
                      const isPending = item.pending_items.includes(checkItem);
                      return (
                        <li key={idx} className={cn("flex items-start gap-1.5", isPending ? "text-foreground" : "text-muted-foreground")}>
                          <span className={isPending ? "text-red-500 mt-0.5" : "text-green-600 mt-0.5"}>
                            {isPending ? "○" : "✓"}
                          </span>
                          <span>{checkItem}</span>
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
        <Button size="sm" className="w-full" onClick={handleOpenDetails}>
          Abrir Detalhes
        </Button>
      </CardFooter>
    </Card>
  );
}
