import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, ChevronRight, Loader2, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import {
  listAlertas,
  listAssignmentNotifs,
  concluirInstancia,
  marcarAlertaLido,
  markAssignmentRead,
  type AlertaResponse,
  type AssignmentNotifResponse,
} from "@/lib/api/prazoService";
import { alertaKeys, assignmentKeys, prazoKeys } from "@/lib/queryKeys";
import { useHomeMetrics } from "@/hooks/useHomeMetrics";
import { STATUS_META, displayStatus, formatVencBr } from "@/components/fundos/prazos/prazoMeta";

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export function AlertsBell() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: home } = useHomeMetrics();
  const fundNameById = useMemo(() => {
    const map = new Map<number, string>();
    home?.fundos?.forEach((f) => {
      map.set(f.idCarteira, (f.apelido?.trim() || f.nome || "").trim() || `Fundo ${f.idCarteira}`);
    });
    return map;
  }, [home?.fundos]);

  const alertaQuery = useQuery({
    queryKey: alertaKeys.list(userId),
    queryFn: () => listAlertas(userId),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const assignmentQuery = useQuery({
    queryKey: assignmentKeys.list(userId),
    queryFn: () => listAssignmentNotifs(userId),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const alertas = alertaQuery.data?.items ?? [];
  const assignments = assignmentQuery.data?.items ?? [];
  const unreadAssignments = assignments.filter((a) => a.lido_em === null);

  // Badge = deadline alerts (always shown) + unread assignment notifs
  const badgeCount = alertas.length + unreadAssignments.length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: alertaKeys.all });
    queryClient.invalidateQueries({ queryKey: prazoKeys.all });
  };

  // Opening the panel marks deadline alerts as read — assignments persist until clicked.
  useEffect(() => {
    if (!open || !userId) return;
    const unreadIds = alertas.filter((a) => !a.lido).map((a) => a.id);
    if (unreadIds.length === 0) return;
    Promise.allSettled(unreadIds.map((id) => marcarAlertaLido(id, userId))).then(() =>
      queryClient.invalidateQueries({ queryKey: alertaKeys.all })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const concluirMut = useMutation({
    mutationFn: (a: AlertaResponse) => concluirInstancia(a.id, userId || "anon"),
    onSuccess: () => {
      invalidate();
      toast({ title: "Prazo concluído", description: "A obrigação foi marcada como cumprida." });
    },
    onError: (e: Error) => toast({ title: "Erro ao concluir", description: e.message, variant: "destructive" }),
  });

  const verDetalhes = (a: AlertaResponse) => {
    setOpen(false);
    navigate(`/fundos?fundo=${a.fundo_id}&tab=prazos`);
  };

  const verAssignment = async (n: AssignmentNotifResponse) => {
    await markAssignmentRead(n.id).catch(() => {});
    queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    setOpen(false);
    navigate(`/fundos?fundo=${n.fundo_id}&tab=prazos`);
  };

  const isLoading = alertaQuery.isLoading || assignmentQuery.isLoading;
  const isEmpty = alertas.length === 0 && unreadAssignments.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Alertas">
          <Bell className="h-5 w-5" />
          {badgeCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs">
              {badgeCount > 99 ? "99+" : badgeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>Notificações</SheetTitle>
          <SheetDescription>
            Atribuições e prazos ativos em todo o portfólio.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : isEmpty ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary/60" />
              <p className="mt-3 text-sm font-medium">Tudo em dia</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <>
              {/* ── Assignment notifications ── */}
              {unreadAssignments.length > 0 && (
                <div>
                  <p className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Atribuições
                  </p>
                  <ul className="divide-y divide-border">
                    {unreadAssignments.map((n) => (
                      <li
                        key={n.id}
                        className={cn("px-5 py-3.5", n.lido_em === null && "bg-primary/[0.04]")}
                      >
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate text-sm font-medium">{n.topico}</span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <div className="min-w-0 truncate text-[12px] text-muted-foreground">
                            {n.assigned_by_nome} atribuiu você a esta tarefa
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {relativeTime(n.criado_em)}
                          </span>
                        </div>
                        <div className="mt-1 flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-0.5 px-2 text-[11px]"
                            onClick={() => verAssignment(n)}
                          >
                            Ver <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Deadline alerts ── */}
              {alertas.length > 0 && (
                <div>
                  {unreadAssignments.length > 0 && (
                    <p className="px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-t">
                      Prazos
                    </p>
                  )}
                  <ul className="divide-y divide-border">
                    {alertas.map((a) => {
                      const st = STATUS_META[displayStatus(a)];
                      return (
                        <li key={a.id} className={cn("px-5 py-3.5", !a.lido && "bg-primary/[0.04]")}>
                          <div className="truncate text-sm font-medium">{a.topico}</div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <div className="min-w-0 truncate text-[12px] text-muted-foreground">
                              {fundNameById.get(a.fundo_id) ?? `Fundo ${a.fundo_id}`}
                              {a.responsaveis?.length > 0 && <> · {a.responsaveis.map((r) => r.nome).join(", ")}</>}
                            </div>
                            <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", st.cls)}>
                              {st.icon}
                              {st.label}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Vence {formatVencBr(a.data_vencimento)}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 px-2 text-[11px]"
                                disabled={concluirMut.isPending}
                                onClick={() => concluirMut.mutate(a)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-0.5 px-2 text-[11px]"
                                onClick={() => verDetalhes(a)}
                              >
                                Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
