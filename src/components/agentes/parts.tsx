import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";

import { MARKDOWN_COMPONENTS, MARKDOWN_PLUGINS } from "@/components/chat/markdown";
import { cn } from "@/lib/utils";

type Tone = "ok" | "draft" | "neutral";

const TONES: Record<Tone, string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  draft: "bg-primary/10 text-primary dark:bg-primary/25 dark:text-[hsl(14,59%,62%)]",
  neutral: "bg-muted text-muted-foreground",
};

/** The state of a version: in use, a draft, or an earlier one. */
export function StatusBadge({ tone, dot = false, children }: { tone: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {dot && <span className="h-1.5 w-1.5 flex-none rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

type Tag<T extends keyof JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & { node?: unknown };

/** The chat's Markdown, with the headings and the code a long prompt has, drawn for reading. */
const READ_COMPONENTS = {
  ...MARKDOWN_COMPONENTS,
  h1: ({ node, ...props }: Tag<"h1">) => <h1 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0" {...props} />,
  h2: ({ node, ...props }: Tag<"h2">) => <h2 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0" {...props} />,
  h3: ({ node, ...props }: Tag<"h3">) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0" {...props} />,
  code: ({ node, ...props }: Tag<"code">) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px]" {...props} />
  ),
};

/** A long markdown text to read: it scrolls inside its box, and can be focused to scroll by keyboard. */
export function ReadArea({ text, label, tall = false }: { text: string; label: string; tall?: boolean }) {
  return (
    <div
      tabIndex={0}
      aria-label={label}
      className={cn(
        "overflow-auto rounded-lg border border-border/70 bg-card/50 px-6 py-5 text-sm leading-relaxed",
        tall ? "max-h-96" : "max-h-80",
      )}
    >
      <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} components={READ_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function Section({
  title,
  hint,
  action,
  first = false,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cn("py-7", !first && "border-t border-border/50")}>
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const FIXED_NOTE = "Servidores, proteções e schema de saída são fixos e não podem ser editados aqui.";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
