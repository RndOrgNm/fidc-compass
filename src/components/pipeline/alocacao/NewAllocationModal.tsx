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
import { useCreateAllocationWorkflow } from "@/hooks/useAllocation";
import { listProspectionWorkflows } from "@/lib/api/prospectionService";
import { listAllocationWorkflows } from "@/lib/api/allocationService";
import { listFunds } from "@/lib/api/fundService";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const APPROVED_WORKFLOWS_KEY = "approved-prospection-workflows";
const ALLOCATION_WORKFLOWS_KEY = "allocation-workflows";
const FUNDS_KEY = "funds-active";

interface NewAllocationModalProps {
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

export function NewAllocationModal({ open, onOpenChange }: NewAllocationModalProps) {
  const [receivableId, setReceivableId] = useState("");
  const [fundId, setFundId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [slaDeadline, setSlaDeadline] = useState("");

  const createAllocation = useCreateAllocationWorkflow();

  const { data: workflowsData, isLoading: loadingWorkflows } = useQuery({
    queryKey: [APPROVED_WORKFLOWS_KEY],
    queryFn: () => listProspectionWorkflows({ status: "approved", limit: 200 }),
    enabled: open,
  });

  const { data: allocationsData } = useQuery({
    queryKey: [ALLOCATION_WORKFLOWS_KEY],
    queryFn: () => listAllocationWorkflows({ limit: 500 }),
    enabled: open,
  });

  const { data: fundsData, isLoading: loadingFunds } = useQuery({
    queryKey: [FUNDS_KEY],
    queryFn: () => listFunds({ status: "active", limit: 100 }),
    enabled: open,
  });

  // Approved recebiveis from Recebíveis pipeline. For merged table, receivable_id is null — use id (recebivel id).
  const allocatedIds = new Set(
    (allocationsData?.items ?? []).map((a) => a.receivable_id)
  );
  const receivablesMap = new Map<string, { id: string; cedente_name: string; nominal_value: number }>();
  for (const w of workflowsData?.items ?? []) {
    const key = w.receivable_id ?? w.id;
    if (allocatedIds.has(key) || receivablesMap.has(key)) continue;
    receivablesMap.set(key, {
      id: key,
      cedente_name: w.cedente_name ?? "—",
      nominal_value: w.receivable_value,
    });
  }
  const receivables = Array.from(receivablesMap.values());

  const funds = fundsData?.items ?? [];

  const resetForm = () => {
    setReceivableId("");
    setFundId("");
    setAssignedTo("");
    setSlaDeadline("");
  };

  const handleSubmit = () => {
    if (!receivableId.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um recebível para alocar",
        variant: "destructive",
      });
      return;
    }

    createAllocation.mutate(
      {
        receivable_id: receivableId.trim(),
        fund_id: fundId.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined,
        sla_deadline: slaDeadline.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          toast({
            title: "Alocação criada com sucesso",
            description: `Workflow de alocação iniciado para o recebível (${data.receivable_number ?? data.receivable_id})`,
          });
          resetForm();
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Erro ao criar alocação",
            description: error instanceof Error ? error.message : "Tente novamente",
            variant: "destructive",
          });
        },
      }
    );
  };

  const isLoadingOptions = loadingWorkflows || loadingFunds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Alocação</DialogTitle>
          <DialogDescription>
            Inicie um novo fluxo de alocação selecionando um recebível aprovado (aprovação no pipeline de Recebíveis).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="receivable">
              Recebível <span className="text-red-500">*</span>
            </Label>
            <Select
              value={receivableId}
              onValueChange={setReceivableId}
              disabled={isLoadingOptions}
            >
              <SelectTrigger id="receivable">
                <SelectValue placeholder={loadingWorkflows ? "Carregando..." : "Selecione o recebível aprovado"} />
              </SelectTrigger>
              <SelectContent>
                {receivables.length === 0 && !loadingWorkflows ? (
                  <SelectItem value="__none__" disabled>
                    Nenhum recebível aprovado disponível (aprovação no pipeline de Recebíveis)
                  </SelectItem>
                ) : (
                  receivables.map((rec) => (
                    <SelectItem key={rec.id} value={rec.id}>
                      {rec.cedente_name} — {formatCurrency(rec.nominal_value)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fund">Fundo (opcional)</Label>
            <Select
              value={fundId || "__none__"}
              onValueChange={(v) => setFundId(v === "__none__" ? "" : v)}
              disabled={loadingFunds}
            >
              <SelectTrigger id="fund">
                <SelectValue placeholder={loadingFunds ? "Carregando..." : "Selecione o fundo"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {funds.map((fund) => (
                  <SelectItem key={fund.id} value={fund.id}>
                    {fund.code} – {fund.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="grid gap-2">
            <Label htmlFor="slaDeadline">Data limite SLA (opcional)</Label>
            <Input
              id="slaDeadline"
              type="datetime-local"
              value={slaDeadline}
              onChange={(e) => setSlaDeadline(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createAllocation.isPending || !receivableId || isLoadingOptions}
          >
            {createAllocation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              "Criar Alocação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
