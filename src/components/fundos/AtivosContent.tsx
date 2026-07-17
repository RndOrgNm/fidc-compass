import { cn } from "@/lib/utils";
import { getAtivosData, type AtivoStatus } from "@/data/ativosData";

export interface AtivosContentProps {
  fundoId: number | null;
  fundName?: string;
}

const STATUS_CHIP: Record<AtivoStatus, string> = {
  "Em dia": "bg-success/15 text-success",
  "Atrasado": "bg-destructive/15 text-destructive",
  "Não iniciado": "bg-amber-400/15 text-amber-400",
};

export function AtivosContent({ fundoId }: AtivosContentProps) {
  if (fundoId == null) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Selecione um fundo para ver seus ativos.
      </p>
    );
  }

  const data = getAtivosData(fundoId);

  if (!data) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Sem dados de ativos disponíveis para este fundo.
      </p>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Obrigações por Empreendimento</h3>
        <span className="text-xs text-muted-foreground">Posição em {data.asOf}</span>
      </div>

      {/* ── Cards por empreendimento/SPE ── */}
      <div className="flex flex-col gap-4">
        {data.assets.map((a, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-l-[3px] border-border bg-card/50 px-5 py-4"
            style={{ borderLeftColor: a.cor }}
          >
            <div className="mb-3">
              <div className="text-sm font-semibold text-foreground">{a.nome}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{a.sub}</div>
            </div>

            {a.obrigacoes.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 pr-3 text-left font-medium">Item</th>
                      <th className="pb-2 px-3 text-left font-medium">Obrigação</th>
                      <th className="pb-2 px-3 text-left font-medium">Responsável</th>
                      <th className="pb-2 px-3 text-left font-medium">Vencimento</th>
                      <th className="pb-2 pl-3 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.obrigacoes.map((o, i) => (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-border/50 transition-colors hover:bg-card/40",
                          i === a.obrigacoes.length - 1 && "border-b-0",
                        )}
                      >
                        <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-[12px] tabular-nums text-muted-foreground">{o.item}</td>
                        <td className="px-3 py-2.5 text-[13px] text-foreground">{o.obrigacao}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{o.responsavel}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground">{o.vencimento}</td>
                        <td className="py-2.5 pl-3 text-right">
                          <span
                            className={cn(
                              "inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10px] font-medium tracking-wide",
                              STATUS_CHIP[o.status],
                            )}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
