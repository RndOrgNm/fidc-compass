import type { Message } from "@ag-ui/core";

import { buildChatItems, type ChatItem } from "./chatItems";
import { passagesFromMessages } from "./citations";

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

/**
 * The conversation's chat items, and the inherited history's apart from them. The passages the
 * Agent read are those of the whole thread, so a marker in the conversation resolves a passage
 * the task read before the person asked anything.
 */
export function conversationItems(messages: Message[]): { inheritedItems: ChatItem[]; items: ChatItem[] } {
  const { inherited, own } = splitInherited(messages);
  const passages = passagesFromMessages(messages);
  return {
    inheritedItems: buildChatItems(inherited, { passages }),
    items: buildChatItems(own, { passages }),
  };
}
