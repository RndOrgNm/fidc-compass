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
import { useCreateMonitoramento } from "@/hooks/useMonitoramento";
import { listProspectionWorkflows } from "@/lib/api/prospectionService";
import { listFunds } from "@/lib/api/fundService";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";

const LIQUIDADO_KEY = "liquidado-workflows";
const FUNDS_KEY = "funds-active";

interface NewMonitoramentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewMonitoramentoModal({ open, onOpenChange }: NewMonitoramentoModalProps) {
  const [fundId, setFundId] = useState("");
  const [period, setPeriod] = useState("");
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const createMonitoramento = useCreateMonitoramento();

  const { data: liquidadoData } = useQuery({
    queryKey: [LIQUIDADO_KEY],
    queryFn: () => listProspectionWorkflows({ status: "liquidado", limit: 500 }),
    enabled: open,
  });

  const { data: fundsData, isLoading: loadingFunds } = useQuery({
    queryKey: [FUNDS_KEY],
    queryFn: () => listFunds({ status: "active", limit: 100 }),
    enabled: open,
  });

  const liquidadoFundIds = new Set(
    (liquidadoData?.items ?? [])
      .map((w) => w.fund_id)
      .filter((id): id is string => !!id)
  );

  const allFunds = fundsData?.items ?? [];
  const eligibleFunds = allFunds.filter((f) => liquidadoFundIds.has(f.id));

  const resetForm = () => {
    setFundId("");
    setPeriod("");
    setTitle("");
    setAssignedTo("");
  };

  const handleSubmit = () => {
    if (!period.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o período (ex: 2025-02)",
        variant: "destructive",
      });
      return;
    }

    const finalTitle = title.trim() || (fundId ? `${eligibleFunds.find((f) => f.id === fundId)?.name ?? "Fund"} — ${period}` : `Monitoramento ${period}`);

    createMonitoramento.mutate(
      {
        title: finalTitle,
        period: period.trim(),
        fund_id: fundId || null,
        assigned_to: assignedTo.trim() || null,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Monitoramento criado",
            description: `${data.title} cadastrado com sucesso.`,
          });
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Erro ao criar monitoramento",
            description: error instanceof Error ? error.message : "Tente novamente",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isLoadingOptions = loadingFunds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Novo Monitoramento</DialogTitle>
          <DialogDescription>
            Crie um novo ciclo de monitoramento. Apenas fundos com operações liquidadas podem receber novo ciclo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fund">
              Fundo <span className="text-red-500">*</span>
            </Label>
            <Select
              value={fundId}
              onValueChange={setFundId}
              disabled={isLoadingOptions}
            >
              <SelectTrigger id="fund">
                <SelectValue
                  placeholder={
                    loadingFunds
                      ? "Carregando..."
                      : eligibleFunds.length === 0
                        ? "Nenhum fundo com operações liquidadas"
                        : "Selecione o fundo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {eligibleFunds.length === 0 && !loadingFunds ? (
                  <SelectItem value="__none__" disabled>
                    Nenhum fundo com operações liquidadas
                  </SelectItem>
                ) : (
                  eligibleFunds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.code} – {fund.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="period">
              Período <span className="text-red-500">*</span>
            </Label>
            <Input
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Ex: 2025-02 (ano-mês)"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Título (opcional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fev/2025 - FIDC Alpha"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assignedTo">Atribuído a (opcional)</Label>
            <Input
              id="assignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Ex: Maria Silva"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createMonitoramento.isPending ||
              !fundId ||
              !period.trim() ||
              isLoadingOptions ||
              eligibleFunds.length === 0
            }
          >
            {createMonitoramento.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar Monitoramento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
