import type { Message } from "@ag-ui/core";
import { describe, expect, it } from "vitest";

import { buildChatItems } from "./chatItems";
import { passagesFromMessages } from "./citations";
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

  it("gives each tool call the progress and logs its own tool reported", () => {
    const call = (id: string, name: string) => ({
      id,
      type: "function" as const,
      function: { name, arguments: "{}" },
    });
    const report = (id: string, tool: string, done: number) => ({
      id,
      role: "activity" as const,
      activityType: "mcp_tool_call",
      content: {
        server: "funds",
        tool,
        progress: { progress: done, total: 4, message: null },
        logs: [{ level: "info", message: `${tool} ${done}` }],
      },
    });
    const messages: Message[] = [
      { id: "u1", role: "user", content: "Compare" },
      { id: "a1", role: "assistant", content: "", toolCalls: [call("c1", "funds__get_fund"), call("c2", "funds__list_funds")] },
      report("act1", "list_funds", 2),
      report("act2", "get_fund", 4),
    ];
    const answer = buildChatItems(messages)[1];
    expect(answer.kind === "assistant" && answer.toolCalls).toMatchObject([
      { id: "c1", logs: ["get_fund 4"], progress: { current: 4, total: 4 } },
      { id: "c2", logs: ["list_funds 2"], progress: { current: 2, total: 4 } },
    ]);
  });

  it("marks a tool call whose result is an error", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "x" },
      {
        id: "a1",
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c1", type: "function", function: { name: "funds__get_fund", arguments: "{}" } }],
      },
      { id: "r1", role: "tool", toolCallId: "c1", content: "boom", error: "boom" },
    ];
    const answer = buildChatItems(messages)[1];
    expect(answer.kind === "assistant" && answer.toolCalls[0].status).toBe("error");
  });

  it("is empty for a thread with no messages", () => {
    expect(buildChatItems([])).toEqual([]);
  });
});

describe("buildChatItems: the sources an answer cites", () => {
  const read = (id: string, ...passages: Record<string, unknown>[]): Message =>
    ({ id, role: "activity", activityType: "passages", content: { passages } }) as Message;
  const passage = (ref: string, label: string, page: number) => ({
    ref,
    label,
    text: `Texto de ${label}.`,
    page_start: page,
    page_end: null,
  });
  const search = (turn: string): Message[] => [
    {
      id: `${turn}-a`,
      role: "assistant",
      content: "",
      toolCalls: [{ id: `${turn}-c`, type: "function", function: { name: "regulatory-search__retrieve", arguments: "{}" } }],
    },
  ];
  const answerOf = (items: ReturnType<typeof buildChatItems>, at: number) => {
    const item = items[at];
    if (item.kind !== "assistant") throw new Error("not an answer");
    return item;
  };

  it("turns the markers into numbered links and keeps only the passages the answer cites", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "Limite por devedor?" },
      ...search("t1"),
      read("t1-passages", passage("sj6tdsf", "Art. 45 — Anexo FIDC", 158), passage("s22rtsf", "Art. 44 — Anexo FIDC", 158)),
      { id: "r1", role: "tool", toolCallId: "t1-c", content: SEARCH_RESULT },
      { id: "a2", role: "assistant", content: "O limite é de 20% [sj6tdsf]." },
    ];
    const answer = answerOf(buildChatItems(messages), 1);
    expect(answer.text).toBe("O limite é de 20% [[1]](#cite-1).");
    expect(answer.citations).toMatchObject([{ n: 1, ref: "sj6tdsf", label: "Art. 45 — Anexo FIDC", pageStart: 158 }]);
    expect(answer.sources).toEqual([]);
  });

  it("makes the same passage cited twice one source", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "x" },
      read("p", passage("c33", "Cláusula 5.6", 5)),
      { id: "a1", role: "assistant", content: "Convoca [c33]. Reúne em 5 dias [c33]." },
    ];
    const answer = answerOf(buildChatItems(messages), 1);
    expect(answer.text).toBe("Convoca [[1]](#cite-1). Reúne em 5 dias [[1]](#cite-1).");
    expect(answer.citations).toHaveLength(1);
  });

  it("does not show a marker for a passage the Agent did not read", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "x" },
      read("p", passage("sj6tdsf", "Art. 45", 158)),
      { id: "a1", role: "assistant", content: "Vale [sj6tdsf] e [szzzzzz]." },
    ];
    const answer = answerOf(buildChatItems(messages), 1);
    expect(answer.text).toBe("Vale [[1]](#cite-1) e.");
    expect(answer.citations.map((c) => c.ref)).toEqual(["sj6tdsf"]);
  });

  it("resolves, in a later turn, a passage that an earlier turn read", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "Art. 45?" },
      ...search("t1"),
      read("t1-passages", passage("sj6tdsf", "Art. 45 — Anexo FIDC", 158)),
      { id: "a2", role: "assistant", content: "Fala do limite [sj6tdsf]." },
      { id: "u2", role: "user", content: "E de onde vem esse 20%?" },
      { id: "a3", role: "assistant", content: "Do mesmo artigo [sj6tdsf]." },
    ];
    const items = buildChatItems(messages);
    expect(answerOf(items, 3).text).toBe("Do mesmo artigo [[1]](#cite-1).");
    expect(answerOf(items, 3).citations[0].label).toBe("Art. 45 — Anexo FIDC");
  });

  it("numbers the sources of each answer from 1", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "a" },
      read("p1", passage("sj6tdsf", "Art. 45", 158), passage("s22rtsf", "Art. 44", 158)),
      { id: "a1", role: "assistant", content: "Um [sj6tdsf]." },
      { id: "u2", role: "user", content: "b" },
      { id: "a2", role: "assistant", content: "Outro [s22rtsf]." },
    ];
    const items = buildChatItems(messages);
    expect(answerOf(items, 1).citations.map((c) => c.n)).toEqual([1]);
    expect(answerOf(items, 3).citations.map((c) => [c.n, c.ref])).toEqual([[1, "s22rtsf"]]);
  });

  it("keeps showing every passage a search returned while a turn does not report what it read", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "O que diz o art. 9?" },
      ...search("t1"),
      { id: "r1", role: "tool", toolCallId: "t1-c", content: SEARCH_RESULT },
      { id: "a2", role: "assistant", content: "Diz isto [Artigo 9]." },
    ];
    const answer = answerOf(buildChatItems(messages), 1);
    expect(answer.sources.map((s) => s.page_number)).toEqual([12, 30]);
    expect(answer.citations).toEqual([]);
    expect(answer.text).toBe("Diz isto [Artigo 9].");
  });

  it("hides a marker still arriving while the run streams", () => {
    const messages: Message[] = [
      { id: "u1", role: "user", content: "x" },
      read("p", passage("sj6tdsf", "Art. 45", 158)),
      { id: "a1", role: "assistant", content: "O limite é [sj6" },
    ];
    expect(answerOf(buildChatItems(messages), 1).text).toBe("O limite é ");
  });

  it("resolves against the passages it is given when the messages are only part of the thread", () => {
    const table = passagesFromMessages([read("p", passage("sj6tdsf", "Art. 45", 158))]);
    const messages: Message[] = [
      { id: "u1", role: "user", content: "x" },
      { id: "a1", role: "assistant", content: "Vale [sj6tdsf]." },
    ];
    expect(answerOf(buildChatItems(messages, { passages: table }), 1).citations).toHaveLength(1);
    expect(answerOf(buildChatItems(messages), 1).citations).toHaveLength(0);
  });
});
