import { describe, expect, it } from "vitest";

import { readEvents } from "./sse";

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

async function collect(response: Response) {
  const events = [];
  for await (const event of readEvents(response)) events.push(event);
  return events;
}

const started = { type: "RUN_STARTED", threadId: "t", runId: "r" };
const finished = { type: "RUN_FINISHED", threadId: "t", runId: "r" };

describe("readEvents", () => {
  it("yields one event per frame", async () => {
    const events = await collect(
      sseResponse([`data: ${JSON.stringify(started)}\n\ndata: ${JSON.stringify(finished)}\n\n`]),
    );
    expect(events).toEqual([started, finished]);
  });

  it("joins a frame that is split across chunks, even in the middle of a line", async () => {
    const frame = `data: ${JSON.stringify(started)}\n\n`;
    const events = await collect(sseResponse([frame.slice(0, 11), frame.slice(11, 30), frame.slice(30)]));
    expect(events).toEqual([started]);
  });

  it("does not split a multi-byte character cut between chunks", async () => {
    const event = { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "não é ação" };
    const bytes = new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
    const cut = bytes.indexOf(0xc3) + 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    expect(await collect(new Response(body))).toEqual([event]);
  });

  it("accepts CRLF line endings", async () => {
    const events = await collect(sseResponse([`data: ${JSON.stringify(started)}\r\n\r\n`]));
    expect(events).toEqual([started]);
  });

  it("joins the data lines of one frame", async () => {
    const events = await collect(sseResponse(['data: {"type":\ndata: "RUN_STARTED"}\n\n']));
    expect(events).toEqual([{ type: "RUN_STARTED" }]);
  });

  it("skips comments and frames with no data", async () => {
    const events = await collect(
      sseResponse([`: keep-alive\n\nevent: ping\n\ndata: ${JSON.stringify(started)}\n\n`]),
    );
    expect(events).toEqual([started]);
  });

  it("reads a last frame that has no blank line after it", async () => {
    const events = await collect(sseResponse([`data: ${JSON.stringify(finished)}`]));
    expect(events).toEqual([finished]);
  });

  it("stops reading when the consumer stops", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(started)}\n\n`));
      },
      cancel() {
        cancelled = true;
      },
    });
    for await (const _ of readEvents(new Response(body))) break;
    expect(cancelled).toBe(true);
  });

  it("fails on a response with no body", async () => {
    await expect(collect(new Response(null))).rejects.toThrow("no body");
  });
});
