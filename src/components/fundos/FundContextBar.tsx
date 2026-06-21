import { useState } from "react";
import { Landmark, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBrlCompact, formatCotaBrl, formatPercentPoints, isNeutralPercent } from "@/lib/formatBr";
import type { HomeFundRow } from "@/types/homeDashboard";

interface FundContextBarProps {
  funds: HomeFundRow[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function fundDisplayName(f: HomeFundRow): string {
  return (f.apelido?.trim() || f.nome).trim() || "—";
}

function fundClassLabel(name: string): string {
  return (name.match(/^(FIDC|FIAGRO|FII|FIM)/) ?? ["Fundo"])[0];
}

function VariationStat({ label, value }: { label: string; value: number | null | undefined }) {
  const neutral = value == null || isNeutralPercent(value);
  const up = !neutral && value! > 0;
  const down = !neutral && value! < 0;
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-0.5 font-mono text-base font-semibold tabular-nums",
        up && "text-success",
        down && "text-destructive",
        neutral && "text-foreground",
      )}>
        {value == null ? "—" : formatPercentPoints(value)}
      </p>
    </div>
  );
}

export function FundContextBar({ funds, loading, selectedId, onSelect }: FundContextBarProps) {
  const [open, setOpen] = useState(false);

  const selected = funds.find((f) => f.idCarteira === selectedId) ?? funds[0] ?? null;

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      {/* ── Fund selector dropdown ── */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={loading || funds.length === 0}
          className={cn(
            "flex min-w-72 items-center gap-3 rounded-lg border border-border bg-card/50 px-3.5 py-2.5",
            "hover:bg-accent transition-colors",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(16,185,129,0.2)]">
            <Landmark className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[15px] font-semibold leading-tight tracking-tight">
              {loading ? "Carregando…" : selected ? fundDisplayName(selected) : "Selecionar fundo"}
            </p>
            {selected && !loading && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fundClassLabel(fundDisplayName(selected))} · {selected.idCarteira} · PL {formatBrlCompact(selected.plAtual)}
              </p>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {open && funds.length > 0 && (
          <>
            {/* backdrop */}
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-[340px] max-h-80 overflow-y-auto rounded-lg border border-border bg-[#10141a] shadow-[0_20px_40px_-12px_rgba(3,6,12,0.7)] p-1.5">
              {funds.map((f) => {
                const active = f.idCarteira === selectedId;
                return (
                  <button
                    key={f.idCarteira}
                    type="button"
                    onClick={() => { onSelect(f.idCarteira); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors",
                      active ? "bg-primary/12" : "hover:bg-accent",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium">{fundDisplayName(f)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{fundClassLabel(fundDisplayName(f))}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-foreground/80">
                        {formatBrlCompact(f.plAtual)}
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Right-side stats ── */}
      {selected && !loading && (
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Cota</p>
            <p className="mt-0.5 font-mono text-base font-semibold tabular-nums text-foreground">
              {formatCotaBrl(selected.cotaAtual)}
            </p>
          </div>
          <VariationStat label="No dia" value={selected.variacaoDiaPct} />
          <VariationStat label="30 dias" value={selected.variacaoPct} />
        </div>
      )}
    </div>
  );
}
