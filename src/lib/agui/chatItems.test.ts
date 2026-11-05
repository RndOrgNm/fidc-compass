import type { Message } from "@ag-ui/core";
import { describe, expect, it } from "vitest";

import { buildChatItems } from "./chatItems";
import { RUN_EVENTS, RUN_SNAPSHOT } from "./fixtures";
import { applyEvent } from "./messages";

const SEARCH_RESULT = JSON.stringify({
  context: "…",
  documents: [
    { section_id: "s1", document_id: "res175", page_number: 12, section_text: "Art. 1" },
    { section_id: "s1", document_id: "res175", page_number: 12, section_text: "Art. 1" },
    { section_id: "s2", document_id: "res175", page_number: 30, section_text: "Art. 9" },
  ],
});

describe("buildChatItems", () => {
  it("shows a question and one answer with its tool call, activity and text", () => {
    const items = buildChatItems(RUN_SNAPSHOT);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ kind: "user", id: "u1", text: "Como está o FIDC X?" });
    expect(items[1]).toMatchObject({
      kind: "assistant",
      text: "Vou consultar.\n\nO FIDC X está ok.",
      toolCalls: [
        { id: "c1", name: "funds__get_fund", args: '{"id":"F1"}', result: '{"name":"FIDC X"}', status: "done" },
      ],
      activities: [{ id: "act1", type: "tool_progress", content: { tool: "funds__get_fund", progress: 1 } }],
    });
  });

  it("shows the same chat for a run built from its events and for the thread read back", () => {
    const live = RUN_EVENTS.reduce(applyEvent, [RUN_SNAPSHOT[0]]);
    expect(buildChatItems(live)).toEqual(buildChatItems(RUN_SNAPSHOT));
  });

  it("keeps a tool call running until its result arrives", () => {
    const midRun = RUN_EVENTS.slice(0, 9).reduce(applyEvent, [RUN_SNAPSHOT[0]]);
    const answer = buildChatItems(midRun)[1];
    expect(answer).toMatchObject({ toolCalls: [{ id: "c1", status: "running" }] });
    expect(answer.kind === "assistant" && answer.toolCalls[0].result).toBeUndefined();
  });

  it("starts a new answer for each question", () => {
    const messages: Message[] = [
      ...RUN_SNAPSHOT,
      { id: "u2", role: "user", content: "E o FIDC Y?" },
      { id: "a3", role: "assistant", content: "Também." },
    ];
    const kinds = buildChatItems(messages).map((i) => i.kind);
    expect(kinds).toEqual(["user", "assistant", "user", "assistant"]);
  });

  it("cites the passages a search returned, once each, in the answer of that turn", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "O que diz o art. 9?" },
      {
        id: "a1",
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "c1", type: "function", function: { name: "regulatory-search__retrieve", arguments: "{}" } },
        ],
      },
      { id: "r1", role: "tool", toolCallId: "c1", content: SEARCH_RESULT },
      { id: "a2", role: "assistant", content: "Diz isto." },
      { id: "u2", role: "user", content: "Obrigado" },
      { id: "a3", role: "assistant", content: "De nada." },
    ];
    const [, first, , second] = buildChatItems(messages);
    expect(first.kind === "assistant" && first.sources.map((s) => s.page_number)).toEqual([12, 30]);
    expect(second.kind === "assistant" && second.sources).toEqual([]);
  });

  it("is empty for a thread with no messages", () => {
    expect(buildChatItems([])).toEqual([]);
  });
});
