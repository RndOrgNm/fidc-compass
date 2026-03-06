import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight } from "lucide-react";
import { listEvents, type EntityType } from "@/lib/api/eventService";

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
  frontend_agent: "Agente",
  whatsapp: "WhatsApp",
  slack: "Slack",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  const events = (data?.items ?? []).filter(
    (e) => e.field_name !== "pending_items"
  );

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum evento registrado.
      </p>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-[200px] max-h-[400px]">
      <div className="space-y-3 pr-3">
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
              {event.event_channel && (
                <Badge variant="outline" className="text-xs">
                  {CHANNEL_LABELS[event.event_channel] ?? event.event_channel}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(event.created_at)}
              </span>
            </div>

            {event.field_name && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">{event.field_name}</span>
                {event.old_value != null && event.new_value != null && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    <span className="line-through">{event.old_value}</span>
                    <ArrowRight className="h-3 w-3 inline" />
                    <span className="font-medium text-foreground">
                      {event.new_value}
                    </span>
                  </span>
                )}
                {event.old_value == null && event.new_value != null && (
                  <span className="ml-1 font-medium text-foreground">
                    {event.new_value}
                  </span>
                )}
              </div>
            )}

            {event.cause_detail && (
              <p className="text-xs text-muted-foreground italic">
                {event.cause_detail}
              </p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
