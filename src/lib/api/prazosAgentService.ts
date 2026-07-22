import { FUNDS_AGENT_API_URL } from "./config";
import {
  conversationListConversations,
  conversationCreateConversation,
  conversationGetConversation,
  conversationGetMessages,
  conversationDeleteConversation,
  conversationGenerateTitle,
} from "./conversationService";
import type { MessageResponse, ApiSource, ConversationResponse, ToolActivityEvent } from "./client";
import type { ConversationWithMetadata } from "./ragService";

export type { ToolActivityEvent };

interface PrazosAgentQueryRequest {
  query: string;
  conversation_id?: string;
  channel?: string;
}

interface PrazosAgentQueryResponse {
  query: string;
  response: string;
  sources: Array<Record<string, unknown>>;
  conversation_id?: string;
}

/** Consumes the /router/ask/stream SSE endpoint: forwards tool-activity events
 * live via onActivity, resolves with the same shape askPrazosAgent used to
 * return once the `final` event arrives. */
async function askPrazosAgent(
  query: string,
  conversationId?: string,
  onActivity?: (event: ToolActivityEvent) => void
): Promise<PrazosAgentQueryResponse> {
  const body: PrazosAgentQueryRequest = { query, channel: "frontend_agent" };
  if (conversationId) {
    body.conversation_id = conversationId;
  }

  const response = await fetch(`${FUNDS_AGENT_API_URL}/router/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: PrazosAgentQueryResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const event = JSON.parse(line.slice(5).trim());
      if (event.type === "final") {
        final = event as PrazosAgentQueryResponse;
      } else if (event.type === "error") {
        throw new Error(event.message || "Erro ao processar consulta");
      } else {
        onActivity?.(event as ToolActivityEvent);
      }
    }
  }

  if (!final) {
    throw new Error("A resposta terminou sem um resultado final");
  }
  return final;
}

export class PrazosAgentService {
  async fetchConversations(
    limit: number = 50
  ): Promise<ConversationWithMetadata[]> {
    const response = await conversationListConversations(limit, "prazos");
    return response.conversations.map((conv) => ({
      ...conv,
      lastMessageAt: conv.updated_at,
      messageCount: undefined,
    }));
  }

  async createNewConversation(
    title: string = "Nova Conversa",
    user?: string
  ): Promise<ConversationResponse> {
    return conversationCreateConversation(title, user, "prazos");
  }

  async getConversation(conversationId: string): Promise<ConversationResponse> {
    return conversationGetConversation(conversationId);
  }

  async loadConversationMessages(
    conversationId: string
  ): Promise<MessageResponse[]> {
    const response = await conversationGetMessages(conversationId);
    const rawMessages = response.messages as unknown as Array<Record<string, unknown>>;
    return rawMessages.map((msg): MessageResponse => {
      const createdAt = msg.created_at;
      const createdStr =
        typeof createdAt === "string"
          ? createdAt
          : createdAt instanceof Date
            ? createdAt.toISOString()
            : new Date().toISOString();
      return {
        message_id: (msg.message_id ?? msg.id) as string,
        conversation_id: msg.conversation_id as string,
        role: msg.role as string,
        content:
          typeof msg.content === "string" ? msg.content : String(msg.content ?? ""),
        sources: (msg.sources as ApiSource[] | null) ?? null,
        created_at: createdStr,
      };
    });
  }

  async sendMessage(
    conversationId: string,
    query: string,
    isFirstMessage: boolean = false,
    onActivity?: (event: ToolActivityEvent) => void
  ): Promise<{ userMessage: MessageResponse; assistantMessage: MessageResponse }> {
    const sendTime = new Date().toISOString();
    const queryResponse = await askPrazosAgent(query, conversationId, onActivity);

    let responseText = queryResponse.response;
    if (typeof responseText !== "string") {
      responseText = String(responseText);
    }

    const responseTime = new Date().toISOString();
    const resolvedConversationId =
      queryResponse.conversation_id || conversationId;

    const userMessage: MessageResponse = {
      message_id: `temp-user-${Date.now()}`,
      conversation_id: resolvedConversationId,
      role: "user",
      content: query,
      created_at: sendTime,
    };

    const assistantMessage: MessageResponse = {
      message_id: `temp-assistant-${Date.now()}`,
      conversation_id: resolvedConversationId,
      role: "assistant",
      content: responseText,
      sources: queryResponse.sources?.length ? queryResponse.sources : null,
      created_at: responseTime,
    };

    if (isFirstMessage) {
      try {
        await conversationGenerateTitle(resolvedConversationId, query);
      } catch (error) {
        console.error("Error generating conversation title:", error);
      }
    }

    return { userMessage, assistantMessage };
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await conversationDeleteConversation(conversationId);
  }
}

export const prazosAgentService = new PrazosAgentService();
