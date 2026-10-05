import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, Pencil, Trash2, Check, X } from "lucide-react";
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  type EntityType,
  type NoteResponse,
} from "@/lib/api/noteService";
import { useToast } from "@/hooks/use-toast";

// Mesma cadeia de fallback de ObrigacaoFormDialog/PrazosContent: nome completo,
// depois primeiro+último nome, depois o e-mail — sempre algo identificável.
function currentUserName(user: ReturnType<typeof useUser>["user"]): string | undefined {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    undefined
  );
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NoteResponse | null>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const queryKey = ["entity-notes", entityType, entityId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listNotes(entityType, entityId),
    enabled,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createNote({
        entity_type: entityType,
        entity_id: entityId,
        content,
        created_by: currentUserName(user),
      }),
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Nota adicionada" });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar nota", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateNote(id, { content }),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Nota atualizada" });
    },
    onError: () => {
      toast({ title: "Erro ao editar nota", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Nota excluída" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir nota", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    mutation.mutate();
  };

  const startEditing = (note: NoteResponse) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const confirmEdit = (id: string) => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    editMutation.mutate({ id, content: trimmed });
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
            {notes.map((note) =>
              editingId === note.id ? (
                <div key={note.id} className="border rounded-md p-3 text-sm space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px] resize-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirmEdit(note.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={!editContent.trim() || editMutation.isPending}
                      onClick={() => confirmEdit(note.id)}
                    >
                      {editMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={note.id}
                  className="group border rounded-md p-3 text-sm space-y-1"
                >
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(note.created_at)}</span>
                        {note.created_by && (
                          <span className="font-medium">{note.created_by}</span>
                        )}
                      </div>
                      {note.updated_at && (
                        <span className="italic">
                          editada em {formatDate(note.updated_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Editar nota"
                        onClick={() => startEditing(note)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        aria-label="Excluir nota"
                        onClick={() => setDeleteTarget(note)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
