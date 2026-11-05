import { EventType } from "@ag-ui/core";
import type { Event, Message } from "@ag-ui/core";

export const QUESTION: Message = { id: "u1", role: "user", content: "Como está o FIDC X?" };

/** A run as the server streams it: text, a tool call with its activity and result, an answer. */
export const RUN_EVENTS = [
  { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" },
  { type: EventType.TEXT_MESSAGE_START, messageId: "a1", role: "assistant" },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "a1", delta: "Vou " },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "a1", delta: "consultar." },
  { type: EventType.TEXT_MESSAGE_END, messageId: "a1" },
  { type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "funds__get_fund", parentMessageId: "a1" },
  { type: EventType.TOOL_CALL_ARGS, toolCallId: "c1", delta: '{"id":' },
  { type: EventType.TOOL_CALL_ARGS, toolCallId: "c1", delta: '"F1"}' },
  { type: EventType.TOOL_CALL_END, toolCallId: "c1" },
  {
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: "act1",
    activityType: "tool_progress",
    content: { tool: "funds__get_fund", progress: 1 },
  },
  { type: EventType.TOOL_CALL_RESULT, messageId: "t-res1", toolCallId: "c1", content: '{"name":"FIDC X"}' },
  { type: EventType.TEXT_MESSAGE_START, messageId: "a2", role: "assistant" },
  { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "a2", delta: "O FIDC X está ok." },
  { type: EventType.TEXT_MESSAGE_END, messageId: "a2" },
  { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" },
] as Event[];

/** What GET /threads/{id}/messages returns for that run. */
export const RUN_SNAPSHOT: Message[] = [
  QUESTION,
  {
    id: "a1",
    role: "assistant",
    content: "Vou consultar.",
    toolCalls: [
      { id: "c1", type: "function", function: { name: "funds__get_fund", arguments: '{"id":"F1"}' } },
    ],
  },
  {
    id: "act1",
    role: "activity",
    activityType: "tool_progress",
    content: { tool: "funds__get_fund", progress: 1 },
  },
  { id: "t-res1", role: "tool", toolCallId: "c1", content: '{"name":"FIDC X"}' },
  { id: "a2", role: "assistant", content: "O FIDC X está ok." },
];
