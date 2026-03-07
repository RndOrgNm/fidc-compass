import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProspectionWorkflow } from "@/lib/api/prospectionService";
import { listFunds } from "@/lib/api/fundService";
import { RECEBIVEIS_STATUS_LABELS } from "@/data/recebiveisPipelineConfig";
import { EntityNotesSection } from "@/components/pipeline/shared/EntityNotesSection";
import { EntityEventsSection } from "@/components/pipeline/shared/EntityEventsSection";

const FUNDS_ACTIVE_KEY = "funds-active";

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

interface RecebivelDetailsModalProps {
  workflow: ProspectionWorkflow | null;
  checklist: Record<string, string[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePendingItems: (workflowId: string, pendingItems: string[]) => void;
  onUpdateFund?: (workflowId: string, fundId: string | null) => void;
}

export function RecebivelDetailsModal({
  workflow,
  checklist,
  open,
  onOpenChange,
  onUpdatePendingItems,
  onUpdateFund,
}: RecebivelDetailsModalProps) {
  if (!workflow) return null;

  const isEnquadramento = workflow.status === "enquadramento_alocacao";
  const { data: fundsData, isLoading: loadingFunds } = useQuery({
    queryKey: [FUNDS_ACTIVE_KEY],
    queryFn: () => listFunds({ status: "active", limit: 200 }),
    enabled: open && isEnquadramento,
  });
  const funds = fundsData?.items ?? [];

  const checklistItems = checklist[workflow.status] ?? [];

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {workflow.cedente_name || "Sem nome"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pl-6 pr-10 space-y-6">
          <section className="space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{RECEBIVEIS_STATUS_LABELS[workflow.status as keyof typeof RECEBIVEIS_STATUS_LABELS] ?? workflow.status}</Badge>
                {workflow.cedente_segment && (
                  <Badge variant="outline">{SEGMENT_LABELS[workflow.cedente_segment] ?? workflow.cedente_segment}</Badge>
                )}
                {workflow.assigned_to && (
                  <Badge variant="outline">Atribuído a: {workflow.assigned_to}</Badge>
                )}
                <Badge variant="outline">{workflow.days_in_progress} dias no status</Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>CNPJ: {formatCnpj(workflow.cedente_cnpj)}</span>
                </div>
                {workflow.estimated_volume > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Volume estimado: {formatCurrency(workflow.estimated_volume)}</span>
                  </div>
                )}
                {workflow.sla_deadline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>SLA: {new Date(workflow.sla_deadline).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>
            </div>

            {isEnquadramento && onUpdateFund && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fundo comprador</Label>
                {loadingFunds ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando fundos...
                  </div>
                ) : (
                  <Select
                    value={workflow.fund_id ?? "none"}
                    onValueChange={(value) =>
                      onUpdateFund(workflow.id, value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fundo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum (aguardando seleção)</SelectItem>
                      {funds.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {checklistItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-sm">Checklist — {RECEBIVEIS_STATUS_LABELS[workflow.status as keyof typeof RECEBIVEIS_STATUS_LABELS] ?? workflow.status}</h4>
                <p className="text-xs text-muted-foreground">
                  Marque os itens concluídos. Quando todos estiverem concluídos, o workflow poderá avançar para o próximo status.
                </p>
                <ScrollArea className="pr-3 -mr-2 border rounded-md p-4 min-h-[120px] max-h-[200px]">
                  <div className="space-y-4">
                    {checklistItems.map((checkItem, idx) => {
                      const isChecked = !(workflow.pending_items ?? []).includes(checkItem);
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <Checkbox
                            id={`receb-check-${workflow.id}-${idx}`}
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              handleCheckChange(checkItem, checked === true)
                            }
                            className="mt-0.5 shrink-0"
                          />
                          <Label
                            htmlFor={`receb-check-${workflow.id}-${idx}`}
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

            {checklistItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {RECEBIVEIS_STATUS_LABELS[workflow.status as keyof typeof RECEBIVEIS_STATUS_LABELS] ?? workflow.status}. Sem checklist pendente.
              </p>
            )}
          </section>

          <section>
            <h4 className="font-medium text-sm mb-2">Eventos</h4>
            <EntityEventsSection
              entityType="recebivel"
              entityId={workflow.id}
              enabled={open}
            />
          </section>

          <section>
            <h4 className="font-medium text-sm mb-2">Notas Livres</h4>
            <EntityNotesSection
              entityType="recebivel"
              entityId={workflow.id}
              enabled={open}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
