import { EventType } from "@ag-ui/core";
import type { ActivityMessage, AssistantMessage, Event, Message, ToolMessage } from "@ag-ui/core";

/** The assistant message `id`, created empty when the stream has not mentioned it yet. */
function withAssistant(
  messages: Message[],
  id: string,
  change: (message: AssistantMessage) => AssistantMessage,
): Message[] {
  const at = messages.findIndex((m) => m.id === id && m.role === "assistant");
  if (at === -1) {
    return [...messages, change({ id, role: "assistant", content: "" })];
  }
  const next = [...messages];
  next[at] = change(messages[at] as AssistantMessage);
  return next;
}

/**
 * The messages after one more event of a run. It builds what the server records, so the messages
 * of a finished run are the same as the ones read back from the thread.
 */
export function applyEvent(messages: Message[], event: Event): Message[] {
  switch (event.type) {
    case EventType.TEXT_MESSAGE_START:
      return withAssistant(messages, event.messageId, (m) => m);

    case EventType.TEXT_MESSAGE_CONTENT:
      return withAssistant(messages, event.messageId, (m) => ({
        ...m,
        content: (m.content ?? "") + event.delta,
      }));

    case EventType.TOOL_CALL_START:
      return withAssistant(messages, event.parentMessageId ?? `${event.toolCallId}-message`, (m) => ({
        ...m,
        toolCalls: [
          ...(m.toolCalls ?? []),
          {
            id: event.toolCallId,
            type: "function",
            function: { name: event.toolCallName, arguments: "" },
          },
        ],
      }));

    case EventType.TOOL_CALL_ARGS:
      return messages.map((m) =>
        m.role === "assistant" && m.toolCalls?.some((c) => c.id === event.toolCallId)
          ? {
              ...m,
              toolCalls: m.toolCalls.map((c) =>
                c.id === event.toolCallId
                  ? { ...c, function: { ...c.function, arguments: c.function.arguments + event.delta } }
                  : c,
              ),
            }
          : m,
      );

    case EventType.TOOL_CALL_RESULT: {
      const result: ToolMessage = {
        id: event.messageId,
        role: "tool",
        toolCallId: event.toolCallId,
        content: event.content,
      };
      return [...messages, result];
    }

    case EventType.ACTIVITY_SNAPSHOT: {
      const activity: ActivityMessage = {
        id: event.messageId,
        role: "activity",
        activityType: event.activityType,
        content: event.content,
      };
      const at = messages.findIndex((m) => m.id === event.messageId);
      if (at === -1) return [...messages, activity];
      const next = [...messages];
      next[at] = activity;
      return next;
    }

    case EventType.MESSAGES_SNAPSHOT:
      return event.messages;

    default:
      return messages;
  }
}
