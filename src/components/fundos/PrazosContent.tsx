import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileDown,
  Sheet as SheetIcon,
  Pencil,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Loader2,
  CalendarClock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/hooks/use-toast";

import {
  listInstancias,
  concluirInstancia,
  reabrirInstancia,
  registrarGatilho,
  deleteObrigacao,
  reconcile,
  type Categoria,
  type InstanciaResponse,
} from "@/lib/api/prazoService";
import { prazoKeys, alertaKeys } from "@/lib/queryKeys";
import {
  CAT_META,
  CAT_ORDER,
  STATUS_META,
  MES_ABBR,
  daysFromTodayISO,
  daysTxt,
  displayStatus,
} from "./prazos/prazoMeta";
import {
  ObrigacaoFormDialog,
  type ObrigacaoFormInitial,
} from "./prazos/ObrigacaoFormDialog";
import { exportPrazosPdf, exportPrazosExcel } from "./prazos/prazoExport";

// ── MiniCalendar ──────────────────────────────────────────────────────────────

function MiniCalendar({
  instancias,
  year,
  month,
  onPrev,
  onNext,
}: {
  instancias: InstanciaResponse[];
  year: number;
  month: number; // 0-indexed
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay: Record<number, { color: string; done: boolean }[]> = {};
  instancias.forEach((i) => {
    if (!i.data_vencimento) return;
    const [y, m, d] = i.data_vencimento.split("-").map(Number);
    if (m === month + 1 && y === year) {
      (byDay[d] = byDay[d] || []).push({ color: CAT_META[i.categoria].color, done: i.status === "CONCLUIDO" });
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = `${["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][month]} ${year}`;

  return (
    <div className="sticky top-6 rounded-xl border border-border bg-card/50 p-[18px]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold">{monthLabel}</span>
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            aria-label="Mês anterior"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onNext}
            aria-label="Próximo mês"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {["D","S","T","Q","Q","S","S"].map((d, i) => (
          <div key={i} className="pb-1 text-center text-[9.5px] uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square opacity-30" />;
          const pips = (byDay[d] || []).slice(0, 3);
          const isToday = d === todayDay;
          return (
            <div
              key={i}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-md text-[12px] tabular-nums text-[#C7CCD4]",
                isToday && "bg-primary/15 font-semibold text-primary"
              )}
            >
              {d}
              {pips.length > 0 && (
                <div className="absolute bottom-[5px] flex gap-[2px]">
                  {pips.map((pip, j) => (
                    <i
                      key={j}
                      className="h-1 w-1 rounded-full"
                      style={{ background: pip.color, opacity: pip.done ? 0.35 : 1 }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3.5">
        {CAT_ORDER.map((c) => (
          <div key={c} className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <i className="h-2 w-2 flex-none rounded-full" style={{ background: CAT_META[c].color }} />
            {CAT_META[c].label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PrazoItem ─────────────────────────────────────────────────────────────────

function PrazoItem({
  inst,
  onConcluir,
  onReabrir,
  onEditar,
  onExcluir,
  onGatilho,
  busy,
}: {
  inst: InstanciaResponse;
  onConcluir: (i: InstanciaResponse) => void;
  onReabrir: (i: InstanciaResponse) => void;
  onEditar: (i: InstanciaResponse) => void;
  onExcluir: (i: InstanciaResponse) => void;
  onGatilho: (i: InstanciaResponse, dataEvento: string) => void;
  busy: boolean;
}) {
  const cat = CAT_META[inst.categoria];
  const st = STATUS_META[displayStatus(inst)];
  const [eventoDate, setEventoDate] = useState(inst.data_evento_gatilho ?? "");

  const venc = inst.data_vencimento;
  const dd = venc ? Number(venc.split("-")[2]) : null;
  const mm = venc ? Number(venc.split("-")[1]) : null;
  const isConcluido = inst.status === "CONCLUIDO";
  const isAguardando = inst.status === "AGUARDANDO_GATILHO";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card/50 px-4 py-3.5 transition-colors hover:border-border/80 hover:bg-card/70 sm:flex-row sm:items-center sm:gap-3.5",
        inst.status === "ATRASADO" && "border-l-2 border-l-destructive",
        inst.status === "PENDENTE" && "border-l-2 border-l-amber-400"
      )}
    >
      {/* Date column */}
      <div className="flex w-full flex-none items-center gap-3 border-border sm:w-[54px] sm:flex-col sm:items-center sm:gap-0 sm:border-r sm:pr-3.5 sm:text-center">
        {dd && mm ? (
          <>
            <div className="text-xl font-semibold tabular-nums leading-none">{String(dd).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground sm:mt-1">{MES_ABBR[mm - 1]}</div>
          </>
        ) : (
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {inst.topico}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ background: `${cat.color}26`, color: cat.color }}
          >
            {cat.label}
          </span>
        </div>

        {inst.descricao && (
          <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">{inst.descricao}</p>
        )}

        {inst.responsavel_nome && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Responsável: <span className="font-medium text-foreground">{inst.responsavel_nome}</span>
          </p>
        )}

        {/* Gatilho inline editor */}
        {isAguardando && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Data do evento:</span>
            <Input
              type="date"
              value={eventoDate}
              onChange={(e) => setEventoDate(e.target.value)}
              className="h-8 w-[150px]"
            />
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              disabled={!eventoDate || busy}
              onClick={() => onGatilho(inst, eventoDate)}
            >
              Registrar
            </Button>
          </div>
        )}
      </div>

      {/* Right side: status + actions */}
      <div className="flex flex-none flex-col items-start gap-1.5 sm:items-end">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", st.cls)}>
          {st.icon}
          {st.label}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {daysTxt(inst.status, inst.data_vencimento)}
        </span>
        <div className="mt-0.5 flex items-center gap-1">
          {isConcluido ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={busy}
              onClick={() => onReabrir(inst)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reabrir
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={busy}
              onClick={() => onConcluir(inst)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            aria-label="Editar"
            disabled={busy}
            onClick={() => onEditar(inst)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="Excluir"
            disabled={busy}
            onClick={() => onExcluir(inst)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── PrazosContent ─────────────────────────────────────────────────────────────

export interface PrazosContentProps {
  fundoId: number | null;
  fundName?: string;
}

export function PrazosContent({ fundoId, fundName }: PrazosContentProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<Categoria | "todos">("todos");
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<ObrigacaoFormInitial | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<InstanciaResponse | null>(null);

  // Current cycle (for the agenda list)
  const query = useQuery({
    queryKey: fundoId ? prazoKeys.instancias(fundoId) : ["prazos", "noop"],
    queryFn: () => listInstancias(fundoId as number),
    enabled: fundoId != null,
  });

  const instancias = query.data?.items ?? [];

  // Calendar cycle — may differ from current when user navigates forward/back
  const currentCiclo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const calCiclo = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`;
  const isCurrentCiclo = calCiclo === currentCiclo;

  const calQuery = useQuery({
    queryKey: fundoId ? prazoKeys.instancias(fundoId, calCiclo) : ["prazos", "noop-cal"],
    queryFn: async () => {
      await reconcile(calCiclo).catch(() => {});
      return listInstancias(fundoId as number, calCiclo);
    },
    enabled: fundoId != null && !isCurrentCiclo,
  });

  // Also fetch the NEXT cycle so cross-month tasks (e.g. "15 days before 10th business day
  // of next month") have their dot shown in the correct calendar month.
  const nextCalDate = new Date(calYear, calMonth + 1, 1);
  const calCicloNext = `${nextCalDate.getFullYear()}-${String(nextCalDate.getMonth() + 1).padStart(2, "0")}`;

  const calQueryNext = useQuery({
    queryKey: fundoId ? prazoKeys.instancias(fundoId, calCicloNext) : ["prazos", "noop-cal-next"],
    queryFn: async () => {
      await reconcile(calCicloNext).catch(() => {});
      return listInstancias(fundoId as number, calCicloNext);
    },
    enabled: fundoId != null,
  });

  const calInstancias = [
    ...(isCurrentCiclo ? instancias : (calQuery.data?.items ?? [])),
    ...(calQueryNext.data?.items ?? []),
  ];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: prazoKeys.all });
    queryClient.invalidateQueries({ queryKey: alertaKeys.all });
  };

  const concluirMut = useMutation({
    mutationFn: (i: InstanciaResponse) =>
      concluirInstancia(i.id, user?.id ?? "anon"),
    onSuccess: () => {
      invalidate();
      toast({ title: "Prazo concluído", description: "A obrigação foi marcada como cumprida." });
    },
    onError: (e: Error) => toast({ title: "Erro ao concluir", description: e.message, variant: "destructive" }),
  });

  const reabrirMut = useMutation({
    mutationFn: (i: InstanciaResponse) => reabrirInstancia(i.id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Prazo reaberto", description: "A conclusão foi desfeita." });
    },
    onError: (e: Error) => toast({ title: "Erro ao reabrir", description: e.message, variant: "destructive" }),
  });

  const gatilhoMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: string }) => registrarGatilho(id, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Gatilho registrado", description: "A data de vencimento foi calculada." });
    },
    onError: (e: Error) => toast({ title: "Erro ao registrar gatilho", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (obrigacaoId: string) => deleteObrigacao(obrigacaoId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Obrigação excluída", description: "O histórico de ciclos anteriores foi preservado." });
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const busy =
    concluirMut.isPending ||
    reabrirMut.isPending ||
    gatilhoMut.isPending ||
    deleteMut.isPending;

  const filtered = filter === "todos" ? instancias : instancias.filter((i) => i.categoria === filter);

  const groups = useMemo(() => {
    const dias = (i: InstanciaResponse) =>
      i.data_vencimento ? daysFromTodayISO(i.data_vencimento) : Infinity;
    return [
      { id: "atrasado", label: "Atrasados", items: filtered.filter((i) => i.status === "ATRASADO") },
      { id: "gatilho", label: "Aguardando gatilho", items: filtered.filter((i) => i.status === "AGUARDANDO_GATILHO") },
      { id: "semana", label: "Esta semana", items: filtered.filter((i) => i.status === "PENDENTE" && dias(i) <= 7) },
      { id: "mes", label: "Próximos 30 dias", items: filtered.filter((i) => i.status === "PENDENTE" && dias(i) > 7 && dias(i) <= 30) },
      { id: "depois", label: "Mais adiante", items: filtered.filter((i) => i.status === "PENDENTE" && dias(i) > 30) },
      { id: "feito", label: "Concluídos recentemente", items: filtered.filter((i) => i.status === "CONCLUIDO") },
    ].filter((g) => g.items.length > 0);
  }, [filtered]);

  // KPIs (over the whole fund, unfiltered)
  const pendentes = instancias.filter((i) => i.status === "PENDENTE").length;
  const atrasados = instancias.filter((i) => i.status === "ATRASADO").length;
  const concluidos = instancias.filter((i) => i.status === "CONCLUIDO").length;
  const prox = instancias
    .filter((i) => i.status === "PENDENTE" && i.data_vencimento && daysFromTodayISO(i.data_vencimento) >= 0)
    .sort((a, b) => daysFromTodayISO(a.data_vencimento!) - daysFromTodayISO(b.data_vencimento!))[0];
  const proxDias = prox ? daysFromTodayISO(prox.data_vencimento!) : null;

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const openCreate = () => { setFormInitial(undefined); setFormOpen(true); };
  const openEdit = (i: InstanciaResponse) => {
    setFormInitial({
      id: i.obrigacao_id,
      topico: i.topico,
      descricao: i.descricao,
      categoria: i.categoria,
      tipo_prazo: i.tipo_prazo,
      parametros: i.parametros,
      antecedencia_alerta_dias: i.antecedencia_alerta_dias,
      responsavel_id: i.responsavel_id,
      responsavel_nome: i.responsavel_nome,
      responsavel_email: i.responsavel_email,
    });
    setFormOpen(true);
  };

  const ciclo = instancias[0]?.ciclo ?? new Date().toISOString().slice(0, 7);
  const safeName = (fundName || "fundo").replace(/[^\w-]+/g, "_");

  const doExportPdf = () =>
    exportPrazosPdf(filtered, `prazos_${safeName}_${ciclo}`, fundName || "Fundo", ciclo).catch((e) =>
      toast({ title: "Erro ao exportar PDF", description: String(e), variant: "destructive" })
    );
  const doExportExcel = () =>
    exportPrazosExcel(filtered, `prazos_${safeName}_${ciclo}`).catch((e) =>
      toast({ title: "Erro ao exportar Excel", description: String(e), variant: "destructive" })
    );

  // ── States: no fund / loading / error ───────────────────────────────────────

  if (fundoId == null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Selecione um fundo para ver suas obrigações.
      </p>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando prazos…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-destructive">Não foi possível carregar os prazos.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const isEmpty = instancias.length === 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Nova obrigação
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={doExportPdf} disabled={filtered.length === 0}>
            <FileDown className="mr-1 h-4 w-4" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={doExportExcel} disabled={filtered.length === 0}>
            <SheetIcon className="mr-1 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Nenhuma obrigação cadastrada</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Crie a primeira obrigação recorrente deste fundo.
          </p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Criar obrigação
          </Button>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card/50 px-4 py-3.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Próximo prazo</div>
              <div className="mt-2 flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums">
                {proxDias != null ? proxDias : "—"}
                {proxDias != null && <small className="text-sm font-normal text-muted-foreground">{proxDias === 1 ? "dia" : "dias"}</small>}
              </div>
              <div className="mt-1.5 truncate text-[11px] text-muted-foreground">{prox ? prox.topico : "—"}</div>
            </div>

            <div className="rounded-lg border border-border bg-card/50 px-4 py-3.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pendentes</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{pendentes}</div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">aguardando ação</div>
            </div>

            <div className={cn(
              "rounded-lg border bg-card/50 px-4 py-3.5",
              atrasados > 0 ? "border-destructive/40 bg-destructive/5" : "border-border"
            )}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Atrasados</div>
              <div className={cn("mt-2 text-2xl font-semibold tabular-nums", atrasados > 0 && "text-destructive")}>{atrasados}</div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">requer atenção</div>
            </div>

            <div className="rounded-lg border border-border bg-card/50 px-4 py-3.5">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Concluídos no mês</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{concluidos}</div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">entregues no prazo</div>
            </div>
          </div>

          {/* Category filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("todos")}
              className={cn(
                "inline-flex items-center rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent",
                filter === "todos" && "border-border/80 bg-accent text-foreground"
              )}
            >
              Todos
            </button>
            {CAT_ORDER.map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent",
                  filter === key && "border-border/80 bg-accent text-foreground"
                )}
              >
                <i className="h-2 w-2 rounded-full" style={{ background: CAT_META[key].color }} />
                {CAT_META[key].label}
              </button>
            ))}
          </div>

          {/* Main layout: agenda + calendar */}
          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_280px]">
            <div className="space-y-6">
              {groups.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum prazo nesta categoria.</p>
              )}
              {groups.map((g) => (
                <div key={g.id}>
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{g.label}</span>
                    <div className="h-px flex-1 bg-border" />
                    <span className="font-mono text-[11px] text-muted-foreground">{g.items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {g.items.map((inst) => (
                      <PrazoItem
                        key={inst.id}
                        inst={inst}
                        busy={busy}
                        onConcluir={(i) => concluirMut.mutate(i)}
                        onReabrir={(i) => reabrirMut.mutate(i)}
                        onEditar={openEdit}
                        onExcluir={(i) => setDeleteTarget(i)}
                        onGatilho={(i, data) => gatilhoMut.mutate({ id: i.id, data })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <MiniCalendar
              instancias={calInstancias}
              year={calYear}
              month={calMonth}
              onPrev={handlePrevMonth}
              onNext={handleNextMonth}
            />
          </div>
        </>
      )}

      {/* Create / edit dialog */}
      <ObrigacaoFormDialog
        fundoId={fundoId}
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={formInitial}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleteTarget?.topico}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A obrigação deixará de aparecer na lista e nos alertas. O histórico de
              ciclos anteriores (instâncias já concluídas) é preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMut.mutate(deleteTarget.obrigacao_id);
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
