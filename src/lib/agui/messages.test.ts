import { EventType } from "@ag-ui/core";
import type { Event, Message } from "@ag-ui/core";
import { describe, expect, it } from "vitest";

import { QUESTION as question, RUN_EVENTS, RUN_SNAPSHOT } from "./fixtures";
import { applyEvent } from "./messages";

function replay(events: Event[], from: Message[] = [question]): Message[] {
  return events.reduce(applyEvent, from);
}

describe("applyEvent", () => {
  it("builds from the events of a run the messages the thread reads back", () => {
    expect(replay(RUN_EVENTS)).toEqual(RUN_SNAPSHOT);
  });

  it("grows the text as it streams", () => {
    const partial = replay(RUN_EVENTS.slice(0, 3));
    expect(partial.at(-1)).toMatchObject({ id: "a1", role: "assistant", content: "Vou " });
  });

  it("shows a tool call as soon as it starts, with the arguments still arriving", () => {
    const partial = replay(RUN_EVENTS.slice(0, 7));
    const call = (partial.at(-1) as Extract<Message, { role: "assistant" }>).toolCalls?.[0];
    expect(call?.function).toEqual({ name: "funds__get_fund", arguments: '{"id":' });
  });

  it("puts a tool call without a parent message in a message of its own", () => {
    const messages = replay(
      [{ type: EventType.TOOL_CALL_START, toolCallId: "c9", toolCallName: "x" } as Event],
      [],
    );
    expect(messages).toEqual([
      {
        id: "c9-message",
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c9", type: "function", function: { name: "x", arguments: "" } }],
      },
    ]);
  });

  it("replaces an activity that reports again instead of adding another", () => {
    const messages = replay([
      { type: EventType.ACTIVITY_SNAPSHOT, messageId: "act1", activityType: "p", content: { n: 1 } },
      { type: EventType.ACTIVITY_SNAPSHOT, messageId: "act1", activityType: "p", content: { n: 2 } },
    ] as Event[], []);
    expect(messages).toEqual([{ id: "act1", role: "activity", activityType: "p", content: { n: 2 } }]);
  });

  it("does not change the list it was given", () => {
    const before: Message[] = [question];
    applyEvent(before, RUN_EVENTS[1]);
    applyEvent(before, RUN_EVENTS[2]);
    expect(before).toEqual([question]);
  });

  it("takes a messages snapshot as the whole list", () => {
    const next = applyEvent([], { type: EventType.MESSAGES_SNAPSHOT, messages: RUN_SNAPSHOT } as Event);
    expect(next).toEqual(RUN_SNAPSHOT);
  });

  it("ignores events that carry no message", () => {
    expect(replay([RUN_EVENTS[0], RUN_EVENTS[14]])).toEqual([question]);
  });
});
