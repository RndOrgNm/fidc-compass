import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONITORAMENTO_CHECKLIST } from "@/data/monitoramentoChecklist";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MonitoramentoPipelineItem } from "./MonitoramentoCard";
import type { MonitoramentoPipelineStatus } from "@/data/pipelineData";
import { MONITORAMENTO_STATUS_BADGES, isMonitoramentoTerminal } from "@/data/monitoramentoPipelineConfig";

interface MonitoramentoListViewProps {
  items: MonitoramentoPipelineItem[];
  onOpenDetails: (item: MonitoramentoPipelineItem) => void;
  onDelete?: (item: MonitoramentoPipelineItem) => void;
}

export function MonitoramentoListView({ items, onOpenDetails, onDelete }: MonitoramentoListViewProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Fundo</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Atribuído a</TableHead>
              <TableHead>Pendências</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const statusBadge = MONITORAMENTO_STATUS_BADGES[item.status] ?? {
                label: item.status,
                className: "bg-gray-100 text-gray-800",
              };
              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <span className="font-medium">{item.title}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.fundName ?? "—"}
                  </TableCell>
                  <TableCell>{item.period}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                  </TableCell>
                  <TableCell>{item.days_in_status} dias</TableCell>
                  <TableCell>
                    {item.assigned_to ?? (
                      <span className="text-muted-foreground">Não atribuído</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.pending_items?.length ? (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger>
                            <button type="button" className="cursor-help inline-flex items-center gap-1">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <span className="text-red-600 font-medium">
                                {item.pending_items.length} {item.pending_items.length === 1 ? "item" : "itens"}
                              </span>
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
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenDetails(item)}
                      >
                        Abrir
                      </Button>
                      {isMonitoramentoTerminal(item.status) && onDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Excluir"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
