import { ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

import type { ToolCallView } from "@/lib/agui/chatItems";

/** `funds-pipeline__listar_instancias` is read as `listar instancias`: the server is noise here. */
export function toolLabel(name: string): string {
  const tool = name.includes("__") ? name.slice(name.indexOf("__") + 2) : name;
  return tool.replace(/_/g, " ");
}

/** One tool the answer called, as a line: running until its result arrives, and a click shows what it did. */
function ToolLine({ item }: { item: ToolCallView }) {
  const [open, setOpen] = useState(false);
  const details = item.progress || item.logs.length > 0 || item.args;

  return (
    <div className="text-sm">
      <button
        type="button"
        title={item.name}
        aria-expanded={open}
        disabled={!details}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground disabled:hover:text-muted-foreground"
      >
        {item.status === "running" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${item.status === "error" ? "bg-destructive" : "bg-success"}`} />
        )}
        <span>{toolLabel(item.name)}</span>
        {details && <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} />}
      </button>
      {open && (
        <div className="mt-1.5 space-y-2 pl-3.5">
          {item.progress && (
            <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${Math.min(100, (item.progress.current / item.progress.total) * 100)}%` }}
              />
            </div>
          )}
          {item.logs.length > 0 && (
            <div className="max-h-32 space-y-0.5 overflow-y-auto rounded-md bg-muted/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              {item.logs.map((log, j) => (
                <div key={j}>{log}</div>
              ))}
            </div>
          )}
          {item.args && item.args !== "{}" && (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
              {item.args}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/** The tools an answer called. */
export function ToolActivityCard({ items }: { items: ToolCallView[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <ToolLine key={item.id} item={item} />
      ))}
    </div>
  );
}
