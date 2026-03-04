import { useState } from "react";
import { LayoutList, LayoutGrid, RefreshCw, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchingKanban } from "./MatchingKanban";
import { MatchingListView } from "./MatchingListView";
import { NewAllocationModal } from "./NewAllocationModal";
import { AlocacaoDetailsModal } from "./AlocacaoDetailsModal";
import { AlocacaoDeleteModal } from "./AlocacaoDeleteModal";
import { fundsData } from "@/data";
import { useAllocationWorkflows, useTransitionAllocationWorkflow, useUpdateAllocationWorkflow, useDeleteAllocation } from "@/hooks/useAllocation";
import type { AllocationWorkflow, AllocationStatus } from "@/lib/api/allocationService";
import { ALLOCATION_COLUMNS } from "@/data/allocationPipelineConfig";

const CURRENT_USER_PLACEHOLDER = "Maria Silva";

export function ClientMatchingTab() {
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fundFilter, setFundFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState("all");
  const [showNewAllocationModal, setShowNewAllocationModal] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<AllocationWorkflow | null>(null);

  const apiFilters = {
    status: statusFilter !== "all" ? (statusFilter as AllocationStatus) : undefined,
    fund_id: fundFilter !== "all" ? fundFilter : undefined,
    assigned_to:
      assignedFilter === "mine" ? CURRENT_USER_PLACEHOLDER : undefined,
    limit: 500,
    offset: 0,
  };

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAllocationWorkflows(apiFilters);
  const transitionMutation = useTransitionAllocationWorkflow();
  const updateAllocation = useUpdateAllocationWorkflow();
  const deleteAllocation = useDeleteAllocation();

  const handleRefresh = () => refetch();

  const handleRequestDelete = (workflow: AllocationWorkflow) => {
    setWorkflowToDelete(workflow);
  };

  const handleConfirmDelete = async (workflow: AllocationWorkflow) => {
    try {
      await deleteAllocation.mutateAsync(workflow.id);
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Alocação excluída", description: "A alocação foi removida com sucesso." });
      if (selectedWorkflowId === workflow.id) setSelectedWorkflowId(null);
      setWorkflowToDelete(null);
    } catch {
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Erro",
        description: "Não foi possível excluir a alocação.",
        variant: "destructive",
      });
    }
  };

  const items = data?.items ?? [];
  const filteredWorkflows: AllocationWorkflow[] = items.filter((wf: AllocationWorkflow) => {
    if (assignedFilter === "unassigned" && wf.assigned_to != null) return false;
    if (slaFilter === "all") return true;
    if (!wf.sla_deadline) return slaFilter !== "overdue";
    const now = new Date();
    const deadline = new Date(wf.sla_deadline);
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (slaFilter === "within" && daysRemaining <= 2) return false;
    if (slaFilter === "approaching" && (daysRemaining < 1 || daysRemaining > 2)) return false;
    if (slaFilter === "overdue" && deadline.getTime() > now.getTime()) return false;
    return true;
  });

  const handleUpdatePendingItems = async (workflowId: string, pendingItems: string[]) => {
    try {
      await updateAllocation.mutateAsync({
        workflowId,
        data: { pending_items: pendingItems },
      });
    } catch {
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os itens pendentes.",
        variant: "destructive",
      });
    }
  };

  const selectedWorkflow = filteredWorkflows.find((wf) => wf.id === selectedWorkflowId) ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alocação em Fundos</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md">
                <Button
                  size="sm"
                  variant={viewMode === "kanban" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("kanban")}
                  className="rounded-r-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <LayoutList className="h-4 w-4" />
                  Lista
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button onClick={() => setShowNewAllocationModal(true)}>
                <Plus className="h-4 w-4" />
                Nova Alocação
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ALLOCATION_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fundo</label>
              <Select value={fundFilter} onValueChange={setFundFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Fundo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {fundsData.map((fund) => (
                    <SelectItem key={fund.id} value={fund.id}>
                      {fund.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Atribuído a</label>
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Atribuído a" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mine">Apenas meus</SelectItem>
                  <SelectItem value="unassigned">Não atribuídos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">SLA</label>
              <Select value={slaFilter} onValueChange={setSlaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="SLA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="within">Dentro do prazo</SelectItem>
                  <SelectItem value="approaching">Próximo ao vencimento</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">
              Erro ao carregar alocações. Tente novamente.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Erro desconhecido"}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleRefresh}>
              Atualizar
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        <MatchingKanban
          workflows={filteredWorkflows}
          onOpenDetails={(wf) => setSelectedWorkflowId(wf.id)}
          onDelete={handleRequestDelete}
        />
      ) : (
        <MatchingListView
          workflows={filteredWorkflows}
          onOpenDetails={(wf) => setSelectedWorkflowId(wf.id)}
          onDelete={handleRequestDelete}
        />
      )}

      <AlocacaoDetailsModal
        workflow={selectedWorkflow}
        open={selectedWorkflowId != null}
        onOpenChange={(open) => !open && setSelectedWorkflowId(null)}
        onUpdatePendingItems={handleUpdatePendingItems}
      />

      <NewAllocationModal
        open={showNewAllocationModal}
        onOpenChange={setShowNewAllocationModal}
      />

      <AlocacaoDeleteModal
        workflow={workflowToDelete}
        open={workflowToDelete != null}
        onOpenChange={(open) => !open && setWorkflowToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteAllocation.isPending}
      />
    </div>
  );
}
