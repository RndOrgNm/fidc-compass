import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useCreateRecebivel } from "@/hooks/useProspection";
import { listCedentes } from "@/lib/api/cedenteService";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { RecebivelCreatePayload, Segment } from "@/lib/api/prospectionService";

const CEDENTES_ATIVOS_KEY = "cedentes-ativos";

interface NewReceivableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCnpj(value: string) {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 14) {
    return numbers
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return value;
}

/** Parse pt-BR currency input to number */
function parseCurrencyInput(str: string): number {
  if (!str || !str.trim()) return 0;
  const s = str.trim().replace(/\s/g, "");
  const hasComma = s.includes(",");
  if (hasComma) {
    const [intPart, decPart] = s.split(",");
    const numStr = (intPart || "").replace(/\./g, "") + "." + (decPart || "0");
    return parseFloat(numStr) || 0;
  }
  const parts = s.split(".");
  if (parts.length === 1) return parseFloat(s) || 0;
  const last = parts[parts.length - 1];
  if (last.length === 3) return parseFloat(s.replace(/\./g, "")) || 0;
  if (last.length <= 2) {
    const intPart = parts.slice(0, -1).join("").replace(/\./g, "");
    return parseFloat(`${intPart}.${last}`) || 0;
  }
  return parseFloat(s.replace(/\./g, "")) || 0;
}

/** Format number to pt-BR currency string */
function formatCurrencyInput(num: number): string {
  if (isNaN(num) || num < 0) return "";
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart === "00" ? withThousands : `${withThousands},${decPart}`;
}

const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: "comercio", label: "Comércio" },
  { value: "industria", label: "Indústria" },
  { value: "servicos", label: "Serviços" },
  { value: "agronegocio", label: "Agronegócio" },
  { value: "varejo", label: "Varejo" },
  { value: "insumos", label: "Insumos" },
];

export function NewReceivableModal({ open, onOpenChange }: NewReceivableModalProps) {
  const [cedenteId, setCedenteId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [nominalValue, setNominalValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [debtorCnpj, setDebtorCnpj] = useState("");
  const [segment, setSegment] = useState("");
  const [estimatedVolume, setEstimatedVolume] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [slaDeadline, setSlaDeadline] = useState("");
  const [riskScore, setRiskScore] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const createRecebivel = useCreateRecebivel();

  const { data: cedentesData, isLoading: loadingCedentes } = useQuery({
    queryKey: [CEDENTES_ATIVOS_KEY],
    queryFn: () => listCedentes({ status: "habilitado", limit: 200 }),
    enabled: open,
  });

  const cedentes = (cedentesData?.items ?? []).filter(
    (c) => (c.pending_items?.length ?? 0) === 0
  );

  // Pre-fill segment from selected cedente (user can still change it)
  useEffect(() => {
    if (cedenteId && cedentes.length > 0) {
      const selected = cedentes.find((c) => c.id === cedenteId);
      if (selected?.segment) setSegment(selected.segment);
    }
  }, [cedenteId, cedentes]);

  const resetForm = () => {
    setCedenteId("");
    setInvoiceNumber("");
    setNominalValue("");
    setDueDate("");
    setDebtorName("");
    setDebtorCnpj("");
    setSegment("");
    setEstimatedVolume("");
    setAssignedTo("");
    setSlaDeadline("");
    setRiskScore("");
  };

  const handleDebtorCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebtorCnpj(formatCnpj(e.target.value));
  };

  const handleNominalValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,.]/g, "");
    setNominalValue(raw);
  };

  const handleNominalValueBlur = () => {
    if (nominalValue === "") return;
    const num = parseCurrencyInput(nominalValue);
    if (!isNaN(num) && num >= 0) setNominalValue(formatCurrencyInput(num));
  };

  const handleEstimatedVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d,.]/g, "");
    setEstimatedVolume(raw);
  };

  const handleEstimatedVolumeBlur = () => {
    if (estimatedVolume === "") return;
    const num = parseCurrencyInput(estimatedVolume);
    if (!isNaN(num) && num >= 0) setEstimatedVolume(formatCurrencyInput(num));
  };

  const handleSubmit = () => {
    if (!cedenteId.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um cedente para o recebível",
        variant: "destructive",
      });
      return;
    }
    if (!invoiceNumber.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o número da nota fiscal",
        variant: "destructive",
      });
      return;
    }
    const value = parseCurrencyInput(nominalValue);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Valor inválido",
        description: "Informe um valor nominal válido",
        variant: "destructive",
      });
      return;
    }
    if (!dueDate.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe a data de vencimento",
        variant: "destructive",
      });
      return;
    }
    if (!debtorName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o nome do sacado",
        variant: "destructive",
      });
      return;
    }
    if (!debtorCnpj.trim() || debtorCnpj.replace(/\D/g, "").length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "Informe o CNPJ completo do sacado (14 dígitos)",
        variant: "destructive",
      });
      return;
    }
    if (!segment.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione o segmento",
        variant: "destructive",
      });
      return;
    }

    const payload: RecebivelCreatePayload = {
      cedente_id: cedenteId.trim(),
      invoice_number: invoiceNumber.trim(),
      nominal_value: value,
      due_date: dueDate,
      debtor_name: debtorName.trim(),
      debtor_cnpj: debtorCnpj.replace(/\D/g, ""),
      segment: segment as Segment,
    };
    const estVol = parseCurrencyInput(estimatedVolume);
    if (estVol > 0) payload.estimated_volume = estVol;
    if (assignedTo.trim()) payload.assigned_to = assignedTo.trim();
    if (slaDeadline.trim()) payload.sla_deadline = slaDeadline;
    const rs = parseInt(riskScore, 10);
    if (!isNaN(rs) && rs >= 0 && rs <= 100) payload.risk_score = rs;

    createRecebivel.mutate(
      payload,
      {
        onSuccess: (data) => {
          const res = data as { invoice_number: string; nominal_value: number };
          toast({
            title: "Recebível criado",
            description: `Nota ${res.invoice_number} (${formatCurrency(res.nominal_value)}) cadastrada na Mesa de Operações.`,
          });
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Erro ao criar recebível",
            description: error instanceof Error ? error.message : "Tente novamente",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isLoadingOptions = loadingCedentes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Recebível</DialogTitle>
          <DialogDescription>
            Cadastre um novo recebível na Mesa de Operações. O título entrará em &quot;Recepção de Borderô&quot;.
            Apenas cedentes Habilitados com checklist completo podem ser selecionados.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 overflow-y-auto min-h-0 pr-2">
          {/* Cedente */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Cedente</h4>
            <div className="grid gap-2">
              <Label htmlFor="cedente">
                Cedente <span className="text-red-500">*</span>
              </Label>
              <Select
                value={cedenteId}
                onValueChange={setCedenteId}
                disabled={isLoadingOptions}
              >
                <SelectTrigger id="cedente">
                  <SelectValue
                    placeholder={
                      loadingCedentes
                        ? "Carregando..."
                        : "Selecione o cedente (Habilitado)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cedentes.length === 0 && !loadingCedentes ? (
                    <SelectItem value="__none__" disabled>
                      Nenhum cedente disponível
                    </SelectItem>
                  ) : (
                    cedentes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName} — {c.cnpj}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Título / Lastro */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Título / Lastro</h4>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="invoiceNumber">
                    Nº da Nota Fiscal <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="invoiceNumber"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ex: NF-12345"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nominalValue">
                    Valor Nominal (R$) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nominalValue"
                    type="text"
                    inputMode="decimal"
                    value={nominalValue}
                    onChange={handleNominalValueChange}
                    onBlur={handleNominalValueBlur}
                    placeholder="Ex: 150.000"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">
                  Data de Vencimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="debtorName">
                  Nome do Sacado <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="debtorName"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  placeholder="Ex: Empresa Sacada Ltda"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="debtorCnpj">
                  CNPJ do Sacado <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="debtorCnpj"
                  value={debtorCnpj}
                  onChange={handleDebtorCnpjChange}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="segment">
                  Segmento <span className="text-red-500">*</span>
                </Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger id="segment">
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Opcionais */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOptions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Mais opções
            </button>
            {showOptions && (
              <div className="grid gap-4 pt-2 border-t">
                <div className="grid gap-2">
                  <Label htmlFor="estimatedVolume">Volume estimado (R$)</Label>
                  <Input
                    id="estimatedVolume"
                    type="text"
                    inputMode="decimal"
                    value={estimatedVolume}
                    onChange={handleEstimatedVolumeChange}
                    onBlur={handleEstimatedVolumeBlur}
                    placeholder="Ex: 150.000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="assignedTo">Atribuir a</Label>
                  <Input
                    id="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slaDeadline">SLA (data limite)</Label>
                  <Input
                    id="slaDeadline"
                    type="datetime-local"
                    value={slaDeadline}
                    onChange={(e) => setSlaDeadline(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="riskScore">Score de risco (0-100)</Label>
                  <Input
                    id="riskScore"
                    type="number"
                    min={0}
                    max={100}
                    value={riskScore}
                    onChange={(e) => setRiskScore(e.target.value)}
                    placeholder="Ex: 75"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createRecebivel.isPending ||
              !cedenteId ||
              !invoiceNumber ||
              !nominalValue ||
              !dueDate ||
              !debtorName ||
              !debtorCnpj ||
              !segment ||
              isLoadingOptions
            }
          >
            {createRecebivel.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              "Criar Recebível"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
