import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
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

function parseCurrencyInput(raw: string): number | null {
  const digits = raw.replace(/[^\d,]/g, "").replace(",", ".");
  const n = parseFloat(digits);
  return isNaN(n) ? null : n;
}

export interface WorkflowUpdateFields {
  estimated_volume?: number | null;
  sla_deadline?: string | null;
  invoice_number?: string | null;
  nominal_value?: number | null;
  due_date?: string | null;
  debtor_name?: string | null;
  debtor_cnpj?: string | null;
}

interface RecebivelDetailsModalProps {
  workflow: ProspectionWorkflow | null;
  checklist: Record<string, string[]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdatePendingItems: (workflowId: string, pendingItems: string[]) => void;
  onUpdateFund?: (workflowId: string, fundId: string | null) => void;
  onUpdateFields?: (workflowId: string, fields: WorkflowUpdateFields) => Promise<void>;
}

export function RecebivelDetailsModal({
  workflow,
  checklist,
  open,
  onOpenChange,
  onUpdatePendingItems,
  onUpdateFund,
  onUpdateFields,
}: RecebivelDetailsModalProps) {
  const [isEditingData, setIsEditingData] = useState(false);
  const [savingFields, setSavingFields] = useState(false);

  // Editable field states
  const [estimatedVolume, setEstimatedVolume] = useState("0");
  const [nominalValue, setNominalValue] = useState("0");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [debtorCnpj, setDebtorCnpj] = useState("");
  const [slaDeadline, setSlaDeadline] = useState("");

  const [fieldsDirty, setFieldsDirty] = useState(false);

  useEffect(() => {
    if (!workflow) return;
    setIsEditingData(false);
    setFieldsDirty(false);
    setEstimatedVolume(workflow.estimated_volume > 0 ? String(workflow.estimated_volume) : "0");
    setNominalValue(workflow.nominal_value != null ? String(workflow.nominal_value) : (workflow.receivable_value > 0 ? String(workflow.receivable_value) : "0"));
    setInvoiceNumber(workflow.invoice_number ?? "");
    setDueDate(workflow.due_date ? workflow.due_date.substring(0, 10) : "");
    setDebtorName(workflow.debtor_name ?? "");
    setDebtorCnpj(workflow.debtor_cnpj ?? "");
    setSlaDeadline(workflow.sla_deadline ? workflow.sla_deadline.substring(0, 10) : "");
  }, [workflow?.id, open]);

  const handleCancelEdit = () => {
    if (!workflow) return;
    setIsEditingData(false);
    setFieldsDirty(false);
    setEstimatedVolume(workflow.estimated_volume > 0 ? String(workflow.estimated_volume) : "0");
    setNominalValue(workflow.nominal_value != null ? String(workflow.nominal_value) : (workflow.receivable_value > 0 ? String(workflow.receivable_value) : "0"));
    setInvoiceNumber(workflow.invoice_number ?? "");
    setDueDate(workflow.due_date ? workflow.due_date.substring(0, 10) : "");
    setDebtorName(workflow.debtor_name ?? "");
    setDebtorCnpj(workflow.debtor_cnpj ?? "");
    setSlaDeadline(workflow.sla_deadline ? workflow.sla_deadline.substring(0, 10) : "");
  };

  const handleSaveFields = async () => {
    if (!workflow || !onUpdateFields) return;
    setSavingFields(true);
    try {
      const fields: WorkflowUpdateFields = {
        estimated_volume: parseCurrencyInput(estimatedVolume) ?? workflow.estimated_volume,
        nominal_value: parseCurrencyInput(nominalValue),
        invoice_number: invoiceNumber.trim() || null,
        due_date: dueDate || null,
        debtor_name: debtorName.trim() || null,
        debtor_cnpj: debtorCnpj.trim() || null,
        sla_deadline: slaDeadline || null,
      };
      await onUpdateFields(workflow.id, fields);
      setIsEditingData(false);
      setFieldsDirty(false);
    } finally {
      setSavingFields(false);
    }
  };

  const isEnquadramento = workflow?.status === "enquadramento_alocacao";
  const { data: fundsData, isLoading: loadingFunds } = useQuery({
    queryKey: [FUNDS_ACTIVE_KEY],
    queryFn: () => listFunds({ status: "active", limit: 200 }),
    enabled: open && !!workflow && isEnquadramento,
  });
  const funds = fundsData?.items ?? [];

  const canonicalItems = (workflow && checklist[workflow.status]) ?? [];
  const pending = workflow?.pending_items ?? [];
  const checklistItems = [...canonicalItems];
  for (const p of pending) {
    if (!canonicalItems.includes(p)) checklistItems.push(p);
  }

  const handleCheckChange = (checkItem: string, checked: boolean) => {
    if (!workflow) return;
    const current = workflow.pending_items ?? [];
    if (checked) {
      onUpdatePendingItems(workflow.id, current.filter((i) => i !== checkItem));
    } else {
      onUpdatePendingItems(workflow.id, [...current, checkItem]);
    }
  };

  const markDirty = () => setFieldsDirty(true);

  if (!workflow) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {workflow.cedente_name || "Sem nome"}
            </DialogTitle>
            {onUpdateFields && (
              <>
                {!isEditingData ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingData(true)}
                    className="shrink-0 mr-2"
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Alterar Dados
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={savingFields}
                    className="shrink-0 mr-2"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancelar
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pl-6 pr-10 space-y-6">
          <section className="space-y-5">
            {/* Badges / static header info */}
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
                {workflow.estimated_volume > 0 && !isEditingData && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Volume estimado: {formatCurrency(workflow.estimated_volume)}</span>
                  </div>
                )}
                {workflow.sla_deadline && !isEditingData && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>SLA: {new Date(workflow.sla_deadline).toLocaleDateString("pt-BR")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Dados operacionais (editable) ─────────────────── */}
            {onUpdateFields && (
              <div className="pt-2 space-y-3">
                <h4 className="text-sm font-medium text-foreground">Dados operacionais</h4>
                {!isEditingData ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {workflow.invoice_number && <p>NF: {workflow.invoice_number}</p>}
                    {((workflow.nominal_value ?? workflow.receivable_value) ?? 0) > 0 && (
                      <p>Valor nominal: {formatCurrency(workflow.nominal_value ?? workflow.receivable_value ?? 0)}</p>
                    )}
                    {workflow.debtor_name && <p>Sacado: {workflow.debtor_name}</p>}
                    {workflow.debtor_cnpj && <p>CNPJ sacado: {formatCnpj(workflow.debtor_cnpj)}</p>}
                    {workflow.due_date && (
                      <p>Vencimento: {new Date(workflow.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    )}
                    {workflow.estimated_volume > 0 && (
                      <p>Volume estimado: {formatCurrency(workflow.estimated_volume)}</p>
                    )}
                    {workflow.sla_deadline && (
                      <p>SLA: {new Date(workflow.sla_deadline).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nº da NF</Label>
                        <Input
                          value={invoiceNumber}
                          onChange={(e) => { setInvoiceNumber(e.target.value); markDirty(); }}
                          placeholder="Ex: 000123"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor nominal (R$)</Label>
                        <Input
                          value={nominalValue}
                          onChange={(e) => { setNominalValue(e.target.value); markDirty(); }}
                          placeholder="Ex: 50000"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome do sacado</Label>
                        <Input
                          value={debtorName}
                          onChange={(e) => { setDebtorName(e.target.value); markDirty(); }}
                          placeholder="Razão social do sacado"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CNPJ do sacado</Label>
                        <Input
                          value={debtorCnpj}
                          onChange={(e) => { setDebtorCnpj(e.target.value); markDirty(); }}
                          placeholder="XX.XXX.XXX/XXXX-XX"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Vencimento</Label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => { setDueDate(e.target.value); markDirty(); }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">SLA (prazo)</Label>
                        <Input
                          type="date"
                          value={slaDeadline}
                          onChange={(e) => { setSlaDeadline(e.target.value); markDirty(); }}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Volume estimado (R$)</Label>
                        <Input
                          value={estimatedVolume}
                          onChange={(e) => { setEstimatedVolume(e.target.value); markDirty(); }}
                          placeholder="Ex: 100000"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    {fieldsDirty && (
                      <Button
                        size="sm"
                        onClick={handleSaveFields}
                        disabled={savingFields}
                        className="w-full"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {savingFields ? "Salvando..." : "Salvar alterações"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Fundo comprador (enquadramento only) ─────────── */}
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

            {/* ── Checklist ────────────────────────────────────── */}
            {checklistItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-medium text-sm">Checklist — {RECEBIVEIS_STATUS_LABELS[workflow.status as keyof typeof RECEBIVEIS_STATUS_LABELS] ?? workflow.status}</h4>
                <p className="text-xs text-muted-foreground">
                  Marque os itens concluídos. Quando todos estiverem concluídos, o workflow poderá avançar para o próximo status.
                </p>
                <ScrollArea className="pr-3 -mr-2 border rounded-md p-4 min-h-[120px] max-h-[320px]">
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
