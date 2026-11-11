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
// The model sometimes copies an id short, even down to `s4`, so the shape allows any `s…`.
const PASSAGE_MARKER = /(\s?)\[(s[0-9a-z]+|c\d+)\]/g;
/** The link target of a citation no passage answers to, drawn as `[?]` instead of a number: the
 *  target ends with `:` and what the model wrote, so the page can say it. */
export const UNKNOWN_SOURCE = "cite-unknown";
// Below this many characters after the `s`, a marker is a citation only if it has a digit, which a
// plain word such as `[sobre]` does not.
const FULL_ID_DIGITS = 6;
const MIN_PREFIX_DIGITS = 4;
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

/** The article a passage is labelled with: `Art. 4 — Anexo FIDC` is 4. */
function articleOf(label: string | null): string | undefined {
  return label?.match(/^Art\.\s*(\d+)/i)?.[1];
}

/**
 * The passage a marker names: the id itself; `s4` is how the model sometimes names Art. 4, the one
 * passage labelled with that article; and, for an id the model cut short, the one passage whose id
 * starts with it. Two passages answering alike is no answer, so it is none.
 */
function passageOf(ref: string, table: PassageTable): CitedPassage | undefined {
  const exact = table.get(ref);
  if (exact || !ref.startsWith("s")) return exact;
  const article = ref.match(/^s(\d{1,3})$/)?.[1];
  if (article) {
    const labelled = [...table.values()].filter((p) => articleOf(p.label) === article);
    return labelled.length === 1 ? labelled[0] : undefined;
  }
  if (ref.length <= MIN_PREFIX_DIGITS) return undefined;
  const starting = [...table.values()].filter((p) => p.ref.startsWith(ref));
  return starting.length === 1 ? starting[0] : undefined;
}

/**
 * The answer's text with each known marker turned into a Markdown link, `[[n]](#cite-n)`, and the
 * sources they point to. The same passage cited twice is the same number and one source.
 */
export function resolveMarkers(text: string, table: PassageTable): { text: string; citations: Citation[] } {
  const numbered = new Map<string, Citation>();
  const resolved = text.replace(HALF_MARKER_AT_END, "").replace(PASSAGE_MARKER, (marker, lead: string, ref: string) => {
    const passage = passageOf(ref, table);
    if (!passage) {
      const shortWord = ref.startsWith("s") && ref.length - 1 < FULL_ID_DIGITS && !/\d/.test(ref);
      // A source the answer cites and that cannot be told is shown as such, never taken out.
      return shortWord ? marker : `${lead}[[?]](#${UNKNOWN_SOURCE}:${ref})`;
    }
    let citation = numbered.get(passage.ref);
    if (!citation) {
      citation = { ...passage, n: numbered.size + 1 };
      numbered.set(passage.ref, citation);
    }
    return `${lead}[[${citation.n}]](#cite-${citation.n})`;
  });
  return { text: resolved, citations: [...numbered.values()] };
}
