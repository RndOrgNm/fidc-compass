import type { ApiSource } from "@/lib/api/client";

/**
 * The regulation passages a turn cites, read from its tool results: a result that is a JSON
 * object with a `documents` list (what the search tool returns) contributes one source per
 * distinct section and page.
 */
export function sourcesFromToolResults(results: string[]): ApiSource[] {
  const sources: ApiSource[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    let data: unknown;
    try {
      data = JSON.parse(result);
    } catch {
      continue;
    }
    const documents = (data as { documents?: unknown } | null)?.documents;
    if (!Array.isArray(documents)) continue;

    for (const doc of documents) {
      if (!doc || typeof doc !== "object") continue;
      const { section_id, document_id, page_number, section_text } = doc as Record<string, unknown>;
      const sectionId = (section_id || document_id) as string | undefined;
      if (!sectionId && !page_number) continue;

      const key = `${sectionId}|${page_number}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({
        section_id: sectionId,
        document_id: document_id as string | undefined,
        page_number: page_number as number | undefined,
        section_text: (section_text as string | undefined) ?? "",
      });
    }
  }
  return sources;
}
