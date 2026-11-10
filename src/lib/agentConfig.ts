import type { AgentVersion, McpServer, ModelOption, SkillVersion } from "@/lib/api/agentConfigService";

export type { ModelOption };

/** What the page edits of one version of an agent; the skills' instructions are by the skill's id. */
export interface ConfigContent {
  provider: string;
  model: string;
  prompt: string;
  skills: Record<string, string>;
}

/** One version of the agent with the version of each skill it points at. */
export interface VersionView {
  agent: AgentVersion;
  skills: SkillVersion[];
}

export interface AgentConfig {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Every version, oldest first. */
  versions: VersionView[];
  mcps: McpServer[];
  /** The models the registry offers. */
  models: ModelOption[];
}

export function slugOf(name: string): string {
  return name.trim().toLowerCase();
}

export function contentOf(view: VersionView): ConfigContent {
  return {
    provider: view.agent.provider,
    model: view.agent.model,
    prompt: view.agent.instructions,
    skills: Object.fromEntries(view.skills.map((s) => [s.id, s.instructions])),
  };
}

function sameSkills(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => k in b && a[k] === b[k]);
}

export function sameContent(a: ConfigContent, b: ConfigContent): boolean {
  return a.provider === b.provider && a.model === b.model && a.prompt === b.prompt && sameSkills(a.skills, b.skills);
}

/** The version a new run uses: the latest published one. */
export function publishedOf(config: AgentConfig): VersionView | null {
  return [...config.versions].reverse().find((v) => v.agent.status === "published") ?? null;
}

/**
 * The draft being edited: the latest version when it is not published and differs from the one in
 * use. The registry has no way to delete a draft, so a draft that was taken back to what is in use
 * is no draft.
 */
export function draftOf(config: AgentConfig): VersionView | null {
  const latest = config.versions.at(-1);
  const published = publishedOf(config);
  if (!latest || !published || latest.agent.status !== "draft") return null;
  return sameContent(contentOf(latest), contentOf(published)) ? null : latest;
}

/** The published versions, newest first. */
export function publishedVersions(config: AgentConfig): VersionView[] {
  return config.versions.filter((v) => v.agent.status === "published").reverse();
}

/** The number the next publication gets: the draft's, or the one after the latest published. */
export function nextVersionOf(config: AgentConfig): number {
  const latest = config.versions.at(-1);
  if (!latest) return 1;
  return latest.agent.status === "draft" ? latest.agent.version : latest.agent.version + 1;
}

// ── Models ──

/** The models the menu offers when the registry does not answer GET /models. */
export const MODEL_OPTIONS: ModelOption[] = [
  { provider: "anthropic", model: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
  { provider: "anthropic", model: "claude-opus-5-5", label: "Claude Opus 5.5" },
  { provider: "anthropic", model: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
];

const PROVIDER_LABELS: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI" };

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider;
}

export function modelLabel(provider: string, model: string, models: ModelOption[] = MODEL_OPTIONS): string {
  return models.find((o) => o.provider === provider && o.model === model)?.label ?? model;
}

export function modelKey(provider: string, model: string): string {
  return `${provider}/${model}`;
}

/** The options of the model menu: the known ones, and the one in use when it is not among them. */
export function modelOptionsFor(provider: string, model: string, models: ModelOption[] = MODEL_OPTIONS): ModelOption[] {
  if (models.some((o) => o.provider === provider && o.model === model)) return models;
  return [{ provider, model, label: model }, ...models];
}

// ── Protections ──

const MIDDLEWARE_LABELS: Record<string, string> = {
  refuse_tools: "Impede aprovar ou rejeitar propostas",
  citations: "Só aceita citações que existem no documento",
  hide_rejections: "Esconde do agente o que as pessoas já rejeitaram",
  inject_source_file: "Preenche o arquivo de origem de cada proposta",
  preload_document: "Lê o documento antes de o modelo começar",
  pin_subject: "Mantém as leituras presas ao documento da execução",
  tool_passages: "Dá um número citável a cada trecho encontrado na busca",
  record_actions: "Para e espera a decisão de uma pessoa depois de propor",
};

export function middlewareLabel(name: string): string {
  return MIDDLEWARE_LABELS[name] ?? name;
}

// ── Differences ──

export interface DiffRow {
  kind: "same" | "add" | "del" | "gap";
  /** Line number in the old text, in the new text. */
  old: number | null;
  next: number | null;
  text: string;
}

export interface Diff {
  rows: DiffRow[];
  added: number;
  removed: number;
}

const CONTEXT_LINES = 2;

/** Line by line differences between two texts; the lines far from any change fold into a gap row. */
export function diffLines(before: string, after: string): Diff {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  // lcs[i][j]: the longest common run of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: "same", old: i + 1, next: j + 1, text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: "del", old: i + 1, next: null, text: a[i++] });
    } else {
      ops.push({ kind: "add", old: null, next: j + 1, text: b[j++] });
    }
  }
  while (i < n) ops.push({ kind: "del", old: i + 1, next: null, text: a[i++] });
  while (j < m) ops.push({ kind: "add", old: null, next: j + 1, text: b[j++] });

  const keep = ops.map(() => false);
  let added = 0;
  let removed = 0;
  ops.forEach((op, k) => {
    if (op.kind === "same") return;
    if (op.kind === "add") added++;
    else removed++;
    for (let q = Math.max(0, k - CONTEXT_LINES); q <= Math.min(ops.length - 1, k + CONTEXT_LINES); q++) keep[q] = true;
  });

  const rows: DiffRow[] = [];
  let hidden = 0;
  const fold = () => {
    if (!hidden) return;
    rows.push({ kind: "gap", old: null, next: null, text: `${hidden} ${hidden === 1 ? "linha sem mudança" : "linhas sem mudança"}` });
    hidden = 0;
  };
  ops.forEach((op, k) => {
    if (keep[k]) {
      fold();
      rows.push(op);
    } else {
      hidden++;
    }
  });
  fold();
  return { rows, added, removed };
}

export function diffSummary(diff: Diff): string {
  return diff.added || diff.removed ? `+${diff.added} −${diff.removed} linhas` : "Sem mudança";
}

export function countText(text: string): string {
  return `${text.split("\n").length} linhas · ${text.length} caracteres`;
}
