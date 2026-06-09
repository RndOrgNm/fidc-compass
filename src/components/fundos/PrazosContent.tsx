import { useState, useMemo } from "react";
import {
  Clock,
  CheckCheck,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type PrazoStatus = "pendente" | "em-dia" | "atrasado" | "concluido";
type PrazoCat = "regulatorio" | "operacional" | "recebivel" | "cotista";

interface Prazo {
  titulo: string;
  cat: PrazoCat;
  fundo: string;
  data: string; // "DD/MM/YYYY"
  status: PrazoStatus;
  resp: string;
  desc: string;
}

// ── Static config ─────────────────────────────────────────────────────────────

const CAT_META: Record<PrazoCat, { label: string; color: string; tw: string }> = {
  regulatorio: { label: "Regulatório", color: "#E0A23C", tw: "text-amber-400" },
  operacional: { label: "Operacional", color: "#10B981", tw: "text-emerald-400" },
  recebivel:   { label: "Recebível",   color: "#5FA8D3", tw: "text-blue-400" },
  cotista:     { label: "Cotista",     color: "#9AA3B2", tw: "text-slate-400" },
};

const STATUS_META: Record<PrazoStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  pendente:  { label: "Pendente",  icon: <Clock className="h-3 w-3" />,          cls: "bg-amber-400/15 text-amber-400" },
  "em-dia":  { label: "Em dia",    icon: <Check className="h-3 w-3" />,           cls: "bg-primary/15 text-primary" },
  atrasado:  { label: "Atrasado",  icon: <AlertTriangle className="h-3 w-3" />,   cls: "bg-destructive/15 text-destructive" },
  concluido: { label: "Concluído", icon: <CheckCheck className="h-3 w-3" />,      cls: "bg-accent text-muted-foreground" },
};

const MES_ABBR = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PRAZOS: Prazo[] = [
  { titulo: "Informe Mensal CVM",            cat: "regulatorio", fundo: "Todos os fundos",  data: "10/06/2026", status: "pendente",  resp: "Compliance",          desc: "Envio do informe mensal à CVM (Res. 175)" },
  { titulo: "Janela de resgate — abertura",  cat: "operacional", fundo: "FII OMEGA",         data: "08/06/2026", status: "pendente",  resp: "Mesa",                desc: "Cotização D+0 · liquidação D+2" },
  { titulo: "Vencimento de recebíveis",      cat: "recebivel",   fundo: "FIDC ORIGIN RL",   data: "06/06/2026", status: "pendente",  resp: "Crédito",             desc: "Carteira de 38 recebíveis · R$ 1,1 mi" },
  { titulo: "Demonstrações Contábeis (trim.)",cat: "regulatorio",fundo: "SUPER FARMS FIAGRO",data: "04/06/2026", status: "atrasado",  resp: "Contábil",            desc: "DRE e balanço do 1º trimestre" },
  { titulo: "Amortização programada",        cat: "operacional", fundo: "FIDC ORIGIN RL",   data: "30/06/2026", status: "em-dia",    resp: "Mesa",                desc: "Amortização da classe Sênior" },
  { titulo: "Fim da carência (lock-up)",     cat: "cotista",     fundo: "FII HEBROM RL",    data: "22/06/2026", status: "em-dia",    resp: "Relações c/ Cotistas", desc: "Encerramento do período de carência de 180d" },
  { titulo: "Assembleia Geral Ordinária",    cat: "regulatorio", fundo: "ABEL 33 FII RI",   data: "28/06/2026", status: "em-dia",    resp: "Jurídico",            desc: "Aprovação de contas do exercício" },
  { titulo: "Composição de Carteira (CDA)",  cat: "regulatorio", fundo: "Todos os fundos",  data: "15/06/2026", status: "em-dia",    resp: "Compliance",          desc: "Envio mensal da composição (CDA)" },
  { titulo: "Informe Mensal CVM — Maio",     cat: "regulatorio", fundo: "Todos os fundos",  data: "10/05/2026", status: "concluido", resp: "Compliance",          desc: "Entregue em 09/05/2026" },
  { titulo: "Janela de resgate — fechamento",cat: "operacional", fundo: "FIAGRO ID GOIANA", data: "02/05/2026", status: "concluido", resp: "Mesa",                desc: "Liquidado em 05/05/2026" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDDMMYYYY(str: string): Date {
  const [d, m, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
}

function daysFromToday(dateStr: string): number {
  const target = parseDDMMYYYY(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function daysTxt(status: PrazoStatus, dias: number): string {
  if (status === "concluido") return "Concluído";
  if (dias < 0) return `${Math.abs(dias)}d em atraso`;
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  return `em ${dias} dias`;
}

// ── MiniCalendar ──────────────────────────────────────────────────────────────

function MiniCalendar({ prazos, year, month, onPrev, onNext }: {
  prazos: Prazo[];
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

  const byDay: Record<number, string[]> = {};
  prazos.forEach((p) => {
    const [d, m, y] = p.data.split("/").map(Number);
    if (m === month + 1 && y === year && p.status !== "concluido") {
      (byDay[d] = byDay[d] || []).push(CAT_META[p.cat].color);
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = `${["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][month]} ${year}`;

  return (
    <div className="sticky top-6 rounded-xl border border-border bg-card/50 p-[18px]">
      {/* Header */}
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

      {/* Day-of-week headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {["D","S","T","Q","Q","S","S"].map((d, i) => (
          <div key={i} className="pb-1 text-center text-[9.5px] uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Cells */}
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
                  {pips.map((color, j) => (
                    <i key={j} className="h-1 w-1 rounded-full" style={{ background: color }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3.5">
        {Object.values(CAT_META).map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <i className="h-2 w-2 flex-none rounded-full" style={{ background: c.color }} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PrazoItem ─────────────────────────────────────────────────────────────────

function PrazoItem({ p }: { p: Prazo & { dias: number } }) {
  const cat = CAT_META[p.cat];
  const st = STATUS_META[p.status];
  const [dd, mm] = p.data.split("/").map(Number);

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-lg border border-border bg-card/50 px-4 py-3.5 transition-colors hover:border-border/80 hover:bg-card/70",
        p.status === "atrasado" && "border-l-2 border-l-destructive",
        p.status === "pendente"  && "border-l-2 border-l-amber-400"
      )}
    >
      {/* Date column */}
      <div className="w-[54px] flex-none border-r border-border pr-3.5 text-center">
        <div className="text-xl font-semibold tabular-nums leading-none">{String(dd).padStart(2, "0")}</div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{MES_ABBR[mm - 1]}</div>
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {p.titulo}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
            style={{ background: `${cat.color}26`, color: cat.color }}
          >
            {cat.label}
          </span>
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {p.desc} · <span className="text-[#C7CCD4]">{p.fundo}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-none flex-col items-end gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", st.cls)}>
          {st.icon}
          {st.label}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{daysTxt(p.status, p.dias)}</span>
        <span className="text-[11px] text-muted-foreground">{p.resp}</span>
      </div>
    </div>
  );
}

// ── PrazosContent ─────────────────────────────────────────────────────────────

export function PrazosContent() {
  const [filter, setFilter] = useState<PrazoCat | "todos">("todos");

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const prazosWithDias = useMemo(
    () => MOCK_PRAZOS.map((p) => ({ ...p, dias: daysFromToday(p.data) })),
    []
  );

  const filtered = filter === "todos" ? prazosWithDias : prazosWithDias.filter((p) => p.cat === filter);

  const groups = [
    { id: "atrasado", label: "Atrasados",             items: filtered.filter((p) => p.status === "atrasado") },
    { id: "semana",   label: "Esta semana",            items: filtered.filter((p) => p.status !== "atrasado" && p.status !== "concluido" && p.dias <= 7) },
    { id: "mes",      label: "Próximos 30 dias",       items: filtered.filter((p) => p.status !== "concluido" && p.dias > 7 && p.dias <= 30) },
    { id: "feito",    label: "Concluídos recentemente", items: filtered.filter((p) => p.status === "concluido") },
  ].filter((g) => g.items.length > 0);

  const pendentes  = prazosWithDias.filter((p) => p.status === "pendente").length;
  const atrasados  = prazosWithDias.filter((p) => p.status === "atrasado").length;
  const concluidos = prazosWithDias.filter((p) => p.status === "concluido").length;
  const prox = prazosWithDias
    .filter((p) => p.status !== "concluido" && p.dias >= 0)
    .sort((a, b) => a.dias - b.dias)[0];

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  return (
    <div>
      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card/50 px-4 py-3.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Próximo prazo</div>
          <div className="mt-2 flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums">
            {prox ? prox.dias : "—"}
            {prox && <small className="text-sm font-normal text-muted-foreground">{prox.dias === 1 ? "dia" : "dias"}</small>}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">{prox ? prox.titulo : ""}</div>
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
        {(Object.entries(CAT_META) as [PrazoCat, typeof CAT_META[PrazoCat]][]).map(([key, c]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent",
              filter === key && "border-border/80 bg-accent text-foreground"
            )}
          >
            <i className="h-2 w-2 rounded-full" style={{ background: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      {/* Main layout: agenda + calendar */}
      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1fr_280px]">
        {/* Agenda groups */}
        <div className="space-y-6">
          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum prazo encontrado.</p>
          )}
          {groups.map((g) => (
            <div key={g.id}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{g.label}</span>
                <div className="h-px flex-1 bg-border" />
                <span className="font-mono text-[11px] text-muted-foreground">{g.items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {g.items.map((p, i) => <PrazoItem p={p} key={i} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Mini calendar */}
        <MiniCalendar
          prazos={MOCK_PRAZOS}
          year={calYear}
          month={calMonth}
          onPrev={handlePrevMonth}
          onNext={handleNextMonth}
        />
      </div>
    </div>
  );
}
