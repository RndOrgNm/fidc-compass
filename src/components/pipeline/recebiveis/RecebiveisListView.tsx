import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, AlertTriangle, AlertCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProspectionWorkflow } from "@/lib/api/prospectionService";
import { RECEBIVEIS_STATUS_BADGES, isRecebivelTerminal } from "@/data/recebiveisPipelineConfig";

interface RecebiveisListViewProps {
  workflows: ProspectionWorkflow[];
  checklist: Record<string, string[]>;
  onOpenDetails?: (workflow: ProspectionWorkflow) => void;
  onDelete?: (workflow: ProspectionWorkflow) => void;
}

export function RecebiveisListView({ workflows, checklist, onOpenDetails, onDelete }: RecebiveisListViewProps) {
  const formatCnpj = (cnpj: string) => {
    if (!cnpj) return "";
    if (cnpj.includes("/") || cnpj.includes(".")) return cnpj;
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

  const getSLABadge = (workflow: ProspectionWorkflow) => {
    if (!workflow.sla_deadline) return null;

    const now = new Date();
    const deadline = new Date(workflow.sla_deadline);
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

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

  const getStatusBadge = (status: string) => {
    const badge = RECEBIVEIS_STATUS_BADGES[status as keyof typeof RECEBIVEIS_STATUS_BADGES] || {
      label: status,
      className: "bg-gray-100 text-gray-800",
    };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getSegmentBadge = (segment: string | null) => {
    if (!segment) return null;
    const segments: Record<string, { label: string; className: string }> = {
      comercio: { label: "Comércio", className: "bg-blue-100 text-blue-800" },
      industria: { label: "Indústria", className: "bg-purple-100 text-purple-800" },
      servicos: { label: "Serviços", className: "bg-cyan-100 text-cyan-800" },
      agronegocio: { label: "Agro", className: "bg-green-100 text-green-800" },
      varejo: { label: "Varejo", className: "bg-orange-100 text-orange-800" },
      insumos: { label: "Insumos", className: "bg-amber-100 text-amber-800" },
    };
    const seg = segments[segment] || { label: segment, className: "bg-gray-100 text-gray-800" };
    return <Badge className={seg.className}>{seg.label}</Badge>;
  };


  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox />
              </TableHead>
              <TableHead>Cedente</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Volume Estimado</TableHead>
              <TableHead>Atribuído a</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Pendências</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workflows.map((workflow) => (
              <TableRow key={workflow.id}>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {workflow.cedente_name || "Sem nome"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {workflow.cedente_cnpj ? formatCnpj(workflow.cedente_cnpj) : "—"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getSegmentBadge(workflow.cedente_segment)}</TableCell>
                <TableCell>{getStatusBadge(workflow.status)}</TableCell>
                <TableCell>
                  <span className="font-medium">
                    {formatCurrency(workflow.estimated_volume || 0)}
                  </span>
                </TableCell>
                <TableCell>
                  {workflow.assigned_to ? (
                    <Badge variant="outline">{workflow.assigned_to}</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50">
                      Não atribuído
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{workflow.days_in_progress} dias</span>
                </TableCell>
                <TableCell>{getSLABadge(workflow)}</TableCell>
                <TableCell>
                  {(workflow.pending_items?.length ?? 0) > 0 ? (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger>
                          <button type="button" className="cursor-help inline-flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-600">
                              {(checklist[workflow.status]?.length ?? 0) > 0
                                ? `${workflow.pending_items.length} de ${checklist[workflow.status]!.length}`
                                : `${workflow.pending_items.length} ${workflow.pending_items.length === 1 ? "pendência" : "pendências"}`}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[320px]">
                          <p className="font-medium mb-1.5">
                            Checklist — {workflow.pending_items.length} pendente{workflow.pending_items.length !== 1 ? "s" : ""} (bloqueia avanço)
                          </p>
                          <ul className="text-sm space-y-1.5">
                            {(checklist[workflow.status] ?? []).length > 0 ? (
                              (checklist[workflow.status] ?? []).map((item, idx) => {
                                const isPending = workflow.pending_items.includes(item);
                                return (
                                  <li key={idx} className={cn("flex items-start gap-1.5", isPending ? "text-foreground" : "text-muted-foreground")}>
                                    <span className={isPending ? "text-red-500 mt-0.5" : "text-green-600 mt-0.5"}>
                                      {isPending ? "○" : "✓"}
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                );
                              })
                            ) : (
                              workflow.pending_items.map((item: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-red-500 mt-0.5">•</span>
                                  <span>{item}</span>
                                </li>
                              ))
                            )}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenDetails?.(workflow)}
                    >
                      Abrir
                    </Button>
                    {isRecebivelTerminal(workflow.status) && onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Excluir"
                        onClick={() => onDelete(workflow)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
