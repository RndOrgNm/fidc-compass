import { EventType } from "@ag-ui/core";
import type { Event, Message } from "@ag-ui/core";
import { describe, expect, it } from "vitest";

import { QUESTION, RUN_EVENTS, RUN_SNAPSHOT } from "./fixtures";
import { streamRun } from "./streamRun";

async function* eventsOf(list: Event[]) {
  for (const event of list) yield event;
}

/** Plays the events and keeps the messages, as the chat does. */
async function play(list: Event[]) {
  let messages: Message[] = [QUESTION];
  const result = await streamRun(eventsOf(list), (update) => {
    messages = update(messages);
  });
  return { messages, result };
}

describe("streamRun", () => {
  it("builds the messages of a run that finishes well", async () => {
    const { messages, result } = await play(RUN_EVENTS);
    expect(result).toBeUndefined();
    expect(messages).toEqual(RUN_SNAPSHOT);
  });

  it("gives each state of the messages as the events arrive", async () => {
    const lengths: number[] = [];
    let messages: Message[] = [];
    await streamRun(eventsOf(RUN_EVENTS), (update) => {
      messages = update(messages);
      lengths.push(messages.length);
    });
    expect(lengths.at(0)).toBe(0);
    expect(lengths.at(-1)).toBe(4);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
  });

  it("reports the reason when the run ends in an error, keeping what it had built", async () => {
    const failing = [
      ...RUN_EVENTS.slice(0, 4),
      { type: EventType.RUN_ERROR, message: "model unavailable" },
    ] as Event[];
    const { messages, result } = await play(failing);
    expect(result).toEqual({ error: "model unavailable" });
    expect(messages.at(-1)).toMatchObject({ role: "assistant", content: "Vou consultar." });
  });

  it("stops at the end of the run, whatever else the stream carries", async () => {
    const extra = [...RUN_EVENTS, { type: EventType.TEXT_MESSAGE_START, messageId: "late", role: "assistant" }];
    const { messages } = await play(extra as Event[]);
    expect(messages.some((m) => m.id === "late")).toBe(false);
  });

  it("ends quietly when the stream closes with no end event", async () => {
    const { result } = await play(RUN_EVENTS.slice(0, 5));
    expect(result).toBeUndefined();
  });
});
