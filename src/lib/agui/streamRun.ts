import { EventType } from "@ag-ui/core";
import type { Event, Message } from "@ag-ui/core";

import { applyEvent } from "./messages";

/**
 * Follows the events of a run and hands each new state of the messages to `onMessages`, until the
 * run finishes. Returns the reason when the run ended in an error, nothing when it finished well.
 */
export async function streamRun(
  events: AsyncIterable<Event>,
  onMessages: (update: (messages: Message[]) => Message[]) => void,
): Promise<{ error: string } | undefined> {
  for await (const event of events) {
    if (event.type === EventType.RUN_ERROR) {
      return { error: event.message };
    }
    onMessages((messages) => applyEvent(messages, event));
    if (event.type === EventType.RUN_FINISHED) return undefined;
  }
  return undefined;
}
