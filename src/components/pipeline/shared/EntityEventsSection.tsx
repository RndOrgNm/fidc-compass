import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { listEvents, type EntityType, type EventResponse } from "@/lib/api/eventService";
import { RECEBIVEIS_STATUS_LABELS } from "@/data/recebiveisPipelineConfig";
import { CEDENTES_STATUS_LABELS } from "@/data/cedentesPipelineConfig";
import { ALLOCATION_STATUS_LABELS } from "@/data/allocationPipelineConfig";
import { CEDENTES_COLUMNS } from "@/data/cedentesPipelineConfig";
import { RECEBIVEIS_COLUMNS } from "@/data/recebiveisPipelineConfig";

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

const CEDENTES_STATUS_ORDER = CEDENTES_COLUMNS.map((c) => c.id);
const RECEBIVEIS_STATUS_ORDER = RECEBIVEIS_COLUMNS.map((c) => c.id);

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

const CREATED_GROUP_KEY = "__created__";

/** Assign each event to a status by walking the timeline. Events are assumed sorted oldest-first. */
function groupEventsByStatus(
  events: EventResponse[],
  statusOrder: string[]
): Map<string, EventResponse[]> {
  const groups = new Map<string, EventResponse[]>();
  let currentStatus: string = statusOrder[0] ?? "";

  for (const event of events) {
    if (event.event_type === "created") {
      const key = CREATED_GROUP_KEY;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
      continue;
    }

    if (event.event_type === "status_changed" && event.field_name === "status") {
      const newVal = event.new_value;
      if (newVal && statusOrder.includes(newVal)) {
        currentStatus = newVal;
      }
    }

    const key = currentStatus;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  return groups;
}

function EventCard({ event }: { event: EventResponse }) {
  return (
    <div className="border rounded-md p-3 text-sm space-y-1.5">
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

interface EntityEventsSectionProps {
  entityType: EntityType;
  entityId: string;
  enabled: boolean;
  /** Current status of the entity. When provided with statusOrder, past statuses are collapsed. */
  currentStatus?: string;
}

export function EntityEventsSection({
  entityType,
  entityId,
  enabled,
  currentStatus,
}: EntityEventsSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["entity-events", entityType, entityId],
    queryFn: () =>
      listEvents({ entity_type: entityType, entity_id: entityId, limit: 200 }),
    enabled,
  });

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

  const statusOrder: string[] =
    entityType === "cedente"
      ? CEDENTES_STATUS_ORDER
      : entityType === "recebivel"
        ? RECEBIVEIS_STATUS_ORDER
        : RECEBIVEIS_STATUS_ORDER;

  const statusLabels =
    entityType === "cedente"
      ? CEDENTES_STATUS_LABELS
      : entityType === "recebivel"
        ? RECEBIVEIS_STATUS_LABELS
        : RECEBIVEIS_STATUS_LABELS;

  const groups = groupEventsByStatus(events, statusOrder);

  const currentIdx =
    currentStatus != null ? statusOrder.indexOf(currentStatus) : -1;

  const shouldCollapse = (statusKey: string): boolean => {
    if (statusKey === CREATED_GROUP_KEY) return false;
    if (currentStatus == null || currentIdx < 0) return false;
    const idx = statusOrder.indexOf(statusKey);
    if (idx < 0) return false;
    return idx < currentIdx;
  };

  const entries = Array.from(groups.entries()).sort((a, b) => {
    const eventsA = a[1];
    const eventsB = b[1];
    const dateA = eventsA[0]?.created_at ?? "";
    const dateB = eventsB[0]?.created_at ?? "";
    return dateA.localeCompare(dateB);
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
      <div className="space-y-3">
        {entries.map(([statusKey, groupEvents]) => {
          const collapsed = shouldCollapse(statusKey);
          const label =
            statusKey === CREATED_GROUP_KEY
              ? "Criado"
              : (statusLabels as Record<string, string>)[statusKey] ?? statusKey;

          if (collapsed) {
            return (
              <Collapsible key={statusKey} defaultOpen={false}>
                <div className="border rounded-md overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between rounded-none h-10 px-3 font-medium text-sm hover:bg-muted/50 [&[data-state=open]_svg]:rotate-90"
                    >
                      <span className="flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 shrink-0 transition-transform" />
                        {label} — {groupEvents.length} evento{groupEvents.length !== 1 ? "s" : ""}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t p-3 space-y-3">
                      {groupEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          }

          return (
            <div key={statusKey} className="space-y-3">
              {statusKey !== CREATED_GROUP_KEY && entries.length > 1 && (
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
              )}
              {groupEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
