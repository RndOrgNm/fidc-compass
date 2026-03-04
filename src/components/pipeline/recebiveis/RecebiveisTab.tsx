import { useState } from "react";
import { Plus, LayoutList, LayoutGrid, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NewReceivableModal } from "./NewReceivableModal";
import { RecebiveisKanban } from "./RecebiveisKanban";
import { RecebiveisListView } from "./RecebiveisListView";
import { RecebivelDetailsModal } from "./RecebivelDetailsModal";
import { RecebivelDeleteModal } from "./RecebivelDeleteModal";
import { useProspectionWorkflows, useUpdateRecebivel, useDeleteRecebivel, useRecebiveisChecklist } from "@/hooks/useProspection";
import { RECEBIVEIS_CHECKLIST } from "@/data/recebiveisChecklist";
import { RECEBIVEIS_COLUMNS } from "@/data/recebiveisPipelineConfig";
import type {
  RecebivelStatus,
  Segment,
  WorkflowFilters,
  ProspectionWorkflow,
} from "@/lib/api/prospectionService";

export function RecebiveisTab() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [slaFilter, setSlaFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  // Build API filters
  const apiFilters: WorkflowFilters = {};
  if (statusFilter !== "all") {
    apiFilters.status = statusFilter as RecebivelStatus;
  }
  if (segmentFilter !== "all") {
    apiFilters.segment = segmentFilter as Segment;
  }

  const { data, isLoading, isFetching, isError, error, refetch } = useProspectionWorkflows(apiFilters);
  const { data: checklistData } = useRecebiveisChecklist();
  const checklist = checklistData ?? RECEBIVEIS_CHECKLIST;
  const updateRecebivel = useUpdateRecebivel();
  const deleteRecebivel = useDeleteRecebivel();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<ProspectionWorkflow | null>(null);

  const handleRequestDelete = (workflow: ProspectionWorkflow) => {
    setWorkflowToDelete(workflow);
  };

  const handleConfirmDelete = async (workflow: ProspectionWorkflow) => {
    try {
      await deleteRecebivel.mutateAsync(workflow.id);
      const { toast } = await import("@/hooks/use-toast");
      toast({ title: "Recebível excluído", description: "O recebível foi removido com sucesso." });
      if (selectedWorkflowId === workflow.id) setSelectedWorkflowId(null);
      setWorkflowToDelete(null);
    } catch {
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Erro",
        description: "Não foi possível excluir o recebível.",
        variant: "destructive",
      });
    }
  };

  // Client-side filtering for assigned and SLA (not supported by backend)
  const filteredWorkflows: ProspectionWorkflow[] = (data?.items ?? []).filter(
    (wf) => {
      if (assignedFilter === "unassigned" && wf.assigned_to !== null) return false;
      // "mine" would require knowing the current user; skip for now

      if (slaFilter !== "all" && wf.sla_deadline) {
        const now = new Date();
        const deadline = new Date(wf.sla_deadline);
        const daysRemaining = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (slaFilter === "within" && daysRemaining <= 2) return false;
        if (slaFilter === "approaching" && (daysRemaining < 1 || daysRemaining > 2)) return false;
        if (slaFilter === "overdue" && deadline.getTime() > now.getTime()) return false;
      }

      return true;
    }
  );

  const handleUpdatePendingItems = async (workflowId: string, pendingItems: string[]) => {
    try {
      await updateRecebivel.mutateAsync({
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
            <CardTitle>Pipeline de Recebíveis</CardTitle>
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
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button onClick={() => setShowNewModal(true)}>
                <Plus className="h-4 w-4" />
                Novo Recebível
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {RECEBIVEIS_COLUMNS.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Segmento</label>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="comercio">Comércio</SelectItem>
                  <SelectItem value="industria">Indústria</SelectItem>
                  <SelectItem value="servicos">Serviços</SelectItem>
                  <SelectItem value="agronegocio">Agronegócio</SelectItem>
                  <SelectItem value="varejo">Varejo</SelectItem>
                  <SelectItem value="insumos">Insumos</SelectItem>
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

      {/* Loading / Error states */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando workflows...</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive">
            Erro ao carregar workflows: {error?.message}
          </p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {viewMode === "kanban" ? (
            <RecebiveisKanban
              workflows={filteredWorkflows}
              checklist={checklist}
              onOpenDetails={(wf) => setSelectedWorkflowId(wf.id)}
              onDelete={handleRequestDelete}
            />
          ) : (
            <RecebiveisListView
              workflows={filteredWorkflows}
              checklist={checklist}
              onOpenDetails={(wf) => setSelectedWorkflowId(wf.id)}
              onDelete={handleRequestDelete}
            />
          )}
        </>
      )}

      <RecebivelDetailsModal
        workflow={selectedWorkflow}
        checklist={checklist}
        open={selectedWorkflowId != null}
        onOpenChange={(open) => !open && setSelectedWorkflowId(null)}
        onUpdatePendingItems={handleUpdatePendingItems}
      />

      <NewReceivableModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
      />

      <RecebivelDeleteModal
        workflow={workflowToDelete}
        open={workflowToDelete != null}
        onOpenChange={(open) => !open && setWorkflowToDelete(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteRecebivel.isPending}
      />
    </div>
  );
}
