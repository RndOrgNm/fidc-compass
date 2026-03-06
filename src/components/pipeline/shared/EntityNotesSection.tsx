import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { listNotes, createNote, type EntityType } from "@/lib/api/noteService";
import { useToast } from "@/hooks/use-toast";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface EntityNotesSectionProps {
  entityType: EntityType;
  entityId: string;
  enabled: boolean;
}

export function EntityNotesSection({
  entityType,
  entityId,
  enabled,
}: EntityNotesSectionProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["entity-notes", entityType, entityId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listNotes(entityType, entityId),
    enabled,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createNote({ entity_type: entityType, entity_id: entityId, content }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Nota adicionada" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar nota", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    mutation.mutate();
  };

  const notes = data?.items ?? [];

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <div className="flex gap-2 shrink-0">
        <Textarea
          placeholder="Escreva uma nota..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[60px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || mutation.isPending}
          className="shrink-0 self-end"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Carregando notas...
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Nenhuma nota adicionada.
        </p>
      ) : (
        <ScrollArea className="flex-1 min-h-[120px] max-h-[340px]">
          <div className="space-y-3 pr-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="border rounded-md p-3 text-sm space-y-1"
              >
                <p className="whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(note.created_at)}</span>
                  {note.created_by && (
                    <span className="font-medium">{note.created_by}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
