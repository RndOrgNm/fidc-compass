import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ToolCallView } from "@/lib/agui/chatItems";

/** The tools an answer called: running until their result arrives, with what they reported. */
export function ToolActivityCard({ items }: { items: ToolCallView[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="min-w-[280px] rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            {item.status === "running" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <span
                className={`h-2 w-2 rounded-full ${item.status === "error" ? "bg-destructive" : "bg-success"}`}
              />
            )}
            <span>{item.name}</span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">call</Badge>
          </div>
          {item.progress && (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Progress</span>
                <span>{item.progress.current}/{item.progress.total}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (item.progress.current / item.progress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
          {item.logs.length > 0 && (
            <div className="mt-2 max-h-32 space-y-0.5 overflow-y-auto rounded-md bg-slate-950 px-3 py-2 font-mono text-[11px] text-blue-300">
              {item.logs.map((log, j) => (
                <div key={j}>&gt;_ {log}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
