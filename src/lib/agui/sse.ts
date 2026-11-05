import type { Event } from "@ag-ui/core";

/** The JSON of one SSE frame: its `data:` lines joined, or null for a comment or an empty frame. */
function frameData(frame: string): string | null {
  const lines = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).replace(/^ /, ""));
  return lines.length ? lines.join("\n") : null;
}

/**
 * Reads the body of a Server-Sent Events response as AG-UI events, one per frame, as they arrive.
 * Frames end with a blank line and may be split anywhere across chunks.
 */
export async function* readEvents(response: Response): AsyncGenerator<Event> {
  if (!response.body) throw new Error("The response has no body to read events from");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");

      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const data = frameData(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        if (data) yield JSON.parse(data) as Event;
      }

      if (done) {
        const data = frameData(buffer);
        if (data) yield JSON.parse(data) as Event;
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
