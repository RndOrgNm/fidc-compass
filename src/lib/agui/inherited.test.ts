import type { Message } from "@ag-ui/core";
import { describe, expect, it } from "vitest";

import { buildChatItems } from "./chatItems";
import { conversationItems, splitInherited } from "./inherited";

const mark = { inherited: true, from_thread_id: "task-1" };

const messages = [
  { id: "task-q", role: "user", content: "Execute a tarefa.", metadata: mark },
  {
    id: "task-a",
    role: "assistant",
    content: "Propus a taxa.",
    toolCalls: [{ id: "c1", type: "function", function: { name: "onedrive-reader__search_document", arguments: "{}" } }],
    metadata: mark,
  },
  { id: "task-t", role: "tool", toolCallId: "c1", content: "{}", metadata: mark },
  { id: "q1", role: "user", content: "De onde veio o 20%?" },
  { id: "a1", role: "assistant", content: "Da cláusula 3.4." },
] as unknown as Message[];

describe("splitInherited", () => {
  it("separates what the thread inherited from a task from the conversation's own, in order", () => {
    const { inherited, own } = splitInherited(messages);

    expect(inherited.map((m) => m.id)).toEqual(["task-q", "task-a", "task-t"]);
    expect(own.map((m) => m.id)).toEqual(["q1", "a1"]);
  });

  it("leaves a thread that inherited nothing as it is", () => {
    const plain = messages.slice(3);

    expect(splitInherited(plain)).toEqual({ inherited: [], own: plain });
  });

  it("treats a message without the mark, or with it false, as the conversation's own", () => {
    const unmarked = [{ id: "m1", role: "user", content: "x", metadata: { inherited: false } }] as unknown as Message[];

    expect(splitInherited(unmarked).own).toHaveLength(1);
  });

  it("builds each side into the items the chat draws: the task's tool calls stay with the task", () => {
    const { inherited, own } = splitInherited(messages);

    const before = buildChatItems(inherited);
    const after = buildChatItems(own);

    expect(before.map((i) => i.kind)).toEqual(["user", "assistant"]);
    expect(before[1].kind === "assistant" && before[1].toolCalls.map((c) => c.status)).toEqual(["done"]);
    expect(after.map((i) => i.kind)).toEqual(["user", "assistant"]);
    expect(after[1].kind === "assistant" && after[1].toolCalls).toEqual([]);
  });
});

describe("conversationItems", () => {
  const read = {
    id: "task-passages",
    role: "activity",
    activityType: "passages",
    content: {
      passages: [{ ref: "c33", label: null, text: "A prestação de contas é mensal.", page_start: 5, page_end: 6 }],
    },
    metadata: mark,
  };

  it("resolves a marker of the conversation against a passage the task read before the person asked", () => {
    const thread = [
      ...messages.slice(0, 3),
      read,
      { id: "q1", role: "user", content: "De onde veio o prazo?" },
      { id: "a1", role: "assistant", content: "Da cláusula sobre prestação de contas [c33]." },
    ] as unknown as Message[];

    const { inheritedItems, items } = conversationItems(thread);

    const answer = items[1];
    expect(answer.kind === "assistant" && answer.text).toBe("Da cláusula sobre prestação de contas [[1]](#cite-1).");
    expect(answer.kind === "assistant" && answer.citations).toMatchObject([{ n: 1, ref: "c33", pageStart: 5, pageEnd: 6 }]);
    expect(inheritedItems.map((i) => i.kind)).toEqual(["user", "assistant"]);
  });

  it("resolves the markers of the inherited history too, with the same table", () => {
    const thread = [
      { id: "task-q", role: "user", content: "Execute.", metadata: mark },
      read,
      { id: "task-a", role: "assistant", content: "Propus o prazo [c33].", metadata: mark },
    ] as unknown as Message[];

    const { inheritedItems } = conversationItems(thread);

    expect(inheritedItems[1].kind === "assistant" && inheritedItems[1].text).toBe("Propus o prazo [[1]](#cite-1).");
  });

  it("is the same as building each side by hand for a thread that read nothing", () => {
    const { inherited, own } = splitInherited(messages);

    expect(conversationItems(messages)).toEqual({ inheritedItems: buildChatItems(inherited), items: buildChatItems(own) });
  });
});
