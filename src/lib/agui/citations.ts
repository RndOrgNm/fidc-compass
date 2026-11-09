import type { Message } from "@ag-ui/core";

/**
 * What the Agent read, as the service reports it after each tool call: the `passages` activity, one
 * item per passage with the id the model cites (`ref`), a label, the text and the pages. The model
 * wrote none of it. The answer carries the ids in brackets (`[sj6tdsf]`, `[c33]`); this turns them
 * into numbered sources, in the order they first appear, and a marker that is not in the table is
 * dropped, so nothing shows as a source that the Agent did not read.
 */
export const PASSAGES_ACTIVITY = "passages";

export interface CitedPassage {
  ref: string;
  label: string | null;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
}

/** Every passage the thread's Agent read so far, by the id it is cited with. */
export type PassageTable = Map<string, CitedPassage>;

/** A numbered source of an answer: the `[n]` in its text points to it. */
export interface Citation extends CitedPassage {
  n: number;
}

// A search result's id is an `s` and base-36 digits; a chunk of the document is `c` and a number.
const PASSAGE_MARKER = /(\s?)\[(s[0-9a-z]{6,}|c\d+)\]/g;
// A marker that has only half arrived while the answer streams: `[sj6` at the very end.
const HALF_MARKER_AT_END = /\[(?:s[0-9a-z]*|c\d*)$/;

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** The passages of all the thread's messages, so a marker resolves in a later turn, or in a thread
 *  opened from a task, as well as in the turn that read the passage. */
export function passagesFromMessages(messages: Message[]): PassageTable {
  const table: PassageTable = new Map();
  for (const message of messages) {
    if (message.role !== "activity" || message.activityType !== PASSAGES_ACTIVITY) continue;
    const listed = (message.content as { passages?: unknown } | null)?.passages;
    if (!Array.isArray(listed)) continue;
    for (const raw of listed) {
      const passage = raw as Record<string, unknown> | null;
      if (!passage || typeof passage.ref !== "string" || typeof passage.text !== "string") continue;
      table.set(passage.ref, {
        ref: passage.ref,
        label: typeof passage.label === "string" ? passage.label : null,
        text: passage.text,
        pageStart: numberOrNull(passage.page_start),
        pageEnd: numberOrNull(passage.page_end),
      });
    }
  }
  return table;
}

/**
 * The answer's text with each known marker turned into a Markdown link, `[[n]](#cite-n)`, and the
 * sources they point to. The same passage cited twice is the same number and one source.
 */
export function resolveMarkers(text: string, table: PassageTable): { text: string; citations: Citation[] } {
  const numbered = new Map<string, Citation>();
  const resolved = text.replace(HALF_MARKER_AT_END, "").replace(PASSAGE_MARKER, (_marker, lead: string, ref: string) => {
    const passage = table.get(ref);
    if (!passage) return "";
    let citation = numbered.get(ref);
    if (!citation) {
      citation = { ...passage, n: numbered.size + 1 };
      numbered.set(ref, citation);
    }
    return `${lead}[[${citation.n}]](#cite-${citation.n})`;
  });
  return { text: resolved, citations: [...numbered.values()] };
}
