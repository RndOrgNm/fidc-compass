import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { Segment } from "@/lib/api/prospectionService";

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

export function NewReceivableModal({ open, onOpenChange }: NewReceivableModalProps) {
  const [cedenteId, setCedenteId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [nominalValue, setNominalValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [debtorCnpj, setDebtorCnpj] = useState("");
  const [segment, setSegment] = useState("");

  const createRecebivel = useCreateRecebivel();

  const { data: cedentesData, isLoading: loadingCedentes } = useQuery({
    queryKey: [CEDENTES_ATIVOS_KEY],
    queryFn: () => listCedentes({ status: "habilitado", limit: 200 }),
    enabled: open,
  });

  const cedentes = (cedentesData?.items ?? []).filter(
    (c) => (c.pending_items?.length ?? 0) === 0
  );

  const resetForm = () => {
    setCedenteId("");
    setInvoiceNumber("");
    setNominalValue("");
    setDueDate("");
    setDebtorName("");
    setDebtorCnpj("");
    setSegment("");
  };

  const handleDebtorCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDebtorCnpj(formatCnpj(e.target.value));
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
    const value = parseFloat(nominalValue);
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

    createRecebivel.mutate(
      {
        cedente_id: cedenteId.trim(),
        invoice_number: invoiceNumber.trim(),
        nominal_value: value,
        due_date: dueDate,
        debtor_name: debtorName.trim(),
        debtor_cnpj: debtorCnpj.replace(/\D/g, ""),
        segment: segment as Segment,
      },
      {
        onSuccess: (data) => {
          const res = data as { invoice_number: string; nominal_value: number };
          toast({
            title: "Recebível criado",
            description: `Nota ${res.invoice_number} (${formatCurrency(res.nominal_value)}) cadastrada com sucesso.`,
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Recebível</DialogTitle>
          <DialogDescription>
            Cadastre um novo recebível (nota fiscal / direito creditório). Só é possível criar recebíveis para cedentes Habilitados com checklist completo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
                      : "Selecione o cedente (Habilitado com checklist completo)"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cedentes.length === 0 && !loadingCedentes ? (
                  <SelectItem value="__none__" disabled>
                    Nenhum cedente disponível (Habilitado com checklist completo)
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
                type="number"
                min={0}
                step={0.01}
                value={nominalValue}
                onChange={(e) => setNominalValue(e.target.value)}
                placeholder="Ex: 50000"
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
                <SelectItem value="comercio">Comércio</SelectItem>
                <SelectItem value="industria">Indústria</SelectItem>
                <SelectItem value="servicos">Serviços</SelectItem>
                <SelectItem value="agronegocio">Agronegócio</SelectItem>
                <SelectItem value="varejo">Varejo</SelectItem>
                <SelectItem value="insumos">Insumos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
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
