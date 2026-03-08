import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight } from "lucide-react";
import { listEvents, type EntityType } from "@/lib/api/eventService";
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

interface EntityEventsSectionProps {
  entityType: EntityType;
  entityId: string;
  enabled: boolean;
}

export function EntityEventsSection({
  entityType,
  entityId,
  enabled,
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-2">
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="border rounded-md p-3 text-sm space-y-1.5"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                className={
                  EVENT_TYPE_COLORS[event.event_type] ??
                  "bg-gray-100 text-gray-800"
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
                {(event.old_value != null && (event.new_value == null || event.new_value === "") && event.event_type === "checklist_updated") && (
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
        ))}
      </div>
    </div>
  );
}
