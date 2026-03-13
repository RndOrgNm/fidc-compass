import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { listEvents, type EntityType } from "@/lib/api/eventService";
import type { EventResponse } from "@/lib/api/eventService";
import { RECEBIVEIS_STATUS_LABELS } from "@/data/recebiveisPipelineConfig";
import { CEDENTES_STATUS_LABELS } from "@/data/cedentesPipelineConfig";
import { ALLOCATION_STATUS_LABELS } from "@/data/allocationPipelineConfig";

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  deleted: "Removido",
  status_changed: "Status alterado",
  checklist_updated: "Checklist atualizado",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-blue-100 text-blue-800",
  deleted: "bg-red-100 text-red-800",
  status_changed: "bg-purple-100 text-purple-800",
  checklist_updated: "bg-amber-100 text-amber-800",
};

const CHANNEL_LABELS: Record<string, string> = {
  frontend: "Frontend",
  frontend_agent: "Funds Agent",
  whatsapp: "WhatsApp",
  slack: "Slack",
};

/** Human-readable labels for technical field names. Never show raw field names. */
const FIELD_NAME_LABELS: Record<string, string> = {
  status: "Status",
  fund_id: "Fundo",
  assigned_to: "Atribuído a",
  cedente_id: "Cedente",
  segment: "Segmento",
  credit_score: "Score de crédito",
  approved_limit: "Limite aprovado",
  proposed_limit: "Limite proposto",
  sla_deadline: "Prazo de SLA",
  estimated_volume: "Volume estimado",
  nominal_value: "Valor nominal",
  due_date: "Data de vencimento",
  debtor_name: "Sacado",
  debtor_cnpj: "CNPJ do sacado",
  invoice_number: "Número da nota",
  risk_score: "Score de risco",
};

/** Merged status labels from all pipelines for translating raw values. */
const STATUS_VALUE_LABELS: Record<string, string> = {
  ...RECEBIVEIS_STATUS_LABELS,
  ...CEDENTES_STATUS_LABELS,
  ...ALLOCATION_STATUS_LABELS,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

function formatEventValue(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const label = STATUS_VALUE_LABELS[value];
  return label ?? value;
}

function formatFieldName(fieldName: string | null | undefined): string {
  if (!fieldName || fieldName === "pending_items") return "";
  return FIELD_NAME_LABELS[fieldName] ?? "";
}

/** Status column for pipeline order (id = status key, title = display label). */
export type StatusColumn = { id: string; title: string };

interface EntityEventsSectionProps {
  entityType: EntityType;
  entityId: string;
  enabled: boolean;
  /** Current entity status — when provided with statusColumns, past-status checklist groups are collapsed. */
  currentStatus?: string;
  /** Pipeline status order — used to determine which statuses are "passed" for collapsing. */
  statusColumns?: StatusColumn[];
}

/**
 * Assigns each checklist_updated event to the status it belongs to, based on timeline.
 */
function assignChecklistEventsToStatus(
  events: EventResponse[],
  statusColumns: StatusColumn[]
): Map<string, string> {
  const eventToStatus = new Map<string, string>();
  const statusIds = statusColumns.map((c) => c.id);
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const firstStatusChange = sorted.find(
    (e) => e.event_type === "status_changed" && e.field_name === "status"
  );
  const initialStatus =
    firstStatusChange?.old_value && statusIds.includes(firstStatusChange.old_value)
      ? firstStatusChange.old_value
      : statusIds[0] ?? null;

  let currentStatus = initialStatus;
  for (const event of sorted) {
    if (event.event_type === "status_changed" && event.field_name === "status") {
      const newVal = event.new_value ?? "";
      if (statusIds.includes(newVal)) currentStatus = newVal;
    }
    if (event.event_type === "checklist_updated") {
      if (currentStatus) eventToStatus.set(event.id, currentStatus);
    }
  }
  return eventToStatus;
}

/**
 * Groups events into expanded (show individually) and collapsed (group by past status).
 */
function groupEvents(
  events: EventResponse[],
  currentStatus: string | undefined,
  statusColumns: StatusColumn[],
  eventToStatus: Map<string, string>
): { expanded: EventResponse[]; collapsed: Map<string, EventResponse[]> } {
  const collapsed = new Map<string, EventResponse[]>();
  const expanded: EventResponse[] = [];
  const statusIds = statusColumns.map((c) => c.id);
  const currentIdx = currentStatus ? statusIds.indexOf(currentStatus) : -1;

  for (const event of events) {
    if (event.event_type !== "checklist_updated") {
      expanded.push(event);
      continue;
    }
    const status = eventToStatus.get(event.id);
    if (!status) {
      expanded.push(event);
      continue;
    }
    const statusIdx = statusIds.indexOf(status);
    const isPassed = currentIdx >= 0 && statusIdx >= 0 && statusIdx < currentIdx;
    if (isPassed) {
      const list = collapsed.get(status) ?? [];
      list.push(event);
      collapsed.set(status, list);
    } else {
      expanded.push(event);
    }
  }

  return { expanded, collapsed };
}

function EventCard({ event }: { event: EventResponse }) {
  return (
    <div key={event.id} className="border rounded-md p-3 text-sm space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          className={
            EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-100 text-gray-800"
          }
        >
          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDate(event.created_at)}
        </span>
      </div>

      {(event.field_name || event.old_value != null || event.new_value != null) && (
        <div className="text-xs text-muted-foreground">
          {formatFieldName(event.field_name) && event.event_type !== "status_changed" && (
            <span className="font-medium">{formatFieldName(event.field_name)}</span>
          )}
          {event.old_value != null && event.new_value != null && (
            <span className="inline-flex items-center gap-1 ml-1">
              <span className="line-through">{formatEventValue(event.old_value)}</span>
              <ArrowRight className="h-3 w-3 inline" />
              <span className="font-medium text-foreground">
                {formatEventValue(event.new_value)}
              </span>
            </span>
          )}
          {event.old_value == null && event.new_value != null && (
            <span className="ml-1 font-medium text-foreground">
              {formatEventValue(event.new_value)}
            </span>
          )}
          {(event.old_value != null &&
            (event.new_value == null || event.new_value === "") &&
            event.event_type === "checklist_updated") && (
            <span className="ml-1 font-medium text-foreground">
              Concluído: {formatEventValue(event.old_value)}
            </span>
          )}
        </div>
      )}

      {event.cause_detail && (
        <p className="text-xs text-muted-foreground italic">
          {event.event_channel
            ? `${CHANNEL_LABELS[event.event_channel] ?? event.event_channel}: ${event.cause_detail}`
            : event.cause_detail}
        </p>
      )}
    </div>
  );
}

export function EntityEventsSection({
  entityType,
  entityId,
  enabled,
  currentStatus,
  statusColumns = [],
}: EntityEventsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["entity-events", entityType, entityId],
    queryFn: () =>
      listEvents({ entity_type: entityType, entity_id: entityId, limit: 200 }),
    enabled,
  });

  const [openCollapsed, setOpenCollapsed] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando eventos...
      </div>
    );
  }

  const events = data?.items ?? [];

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum evento registrado.
      </p>
    );
  }

  const canCollapse = currentStatus && statusColumns.length > 0;
  const eventToStatus = canCollapse
    ? assignChecklistEventsToStatus(events, statusColumns)
    : new Map<string, string>();
  const { expanded, collapsed } = canCollapse
    ? groupEvents(events, currentStatus, statusColumns, eventToStatus)
    : { expanded: events, collapsed: new Map<string, EventResponse[]>() };

  const statusLabels: Record<string, string> = {
    ...RECEBIVEIS_STATUS_LABELS,
    ...CEDENTES_STATUS_LABELS,
    ...ALLOCATION_STATUS_LABELS,
  };
  const getStatusLabel = (id: string) =>
    statusColumns.find((c) => c.id === id)?.title ?? statusLabels[id] ?? id;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
      <div className="space-y-3">
        {expanded.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}

        {Array.from(collapsed.entries())
          .sort(([a], [b]) => {
            const ai = statusColumns.findIndex((c) => c.id === a);
            const bi = statusColumns.findIndex((c) => c.id === b);
            return bi - ai;
          })
          .map(([status, statusEvents]) => {
            const isOpen = openCollapsed[status] ?? false;
            const label = getStatusLabel(status);
            return (
              <Collapsible
                key={status}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenCollapsed((prev) => ({ ...prev, [status]: open }))
                }
              >
                <div className="border rounded-md overflow-hidden">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Badge className="bg-amber-100 text-amber-800">
                      Checklist atualizado
                    </Badge>
                    <span className="text-muted-foreground">
                      {statusEvents.length} itens concluídos em {label}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-3 py-2 space-y-2 bg-muted/20">
                      {statusEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
      </div>
    </div>
  );
}
