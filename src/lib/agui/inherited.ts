import type { Message } from "@ag-ui/core";

/**
 * A thread opened from a task starts with that task's messages, which the service marks
 * `metadata.inherited`. The chat shows them apart from the conversation: what the Agent did before
 * the person asked anything.
 */
export function splitInherited(messages: Message[]): { inherited: Message[]; own: Message[] } {
  const inherited: Message[] = [];
  const own: Message[] = [];
  for (const message of messages) {
    const marked = (message as { metadata?: { inherited?: boolean } }).metadata?.inherited === true;
    (marked ? inherited : own).push(message);
  }
  return { inherited, own };
}
