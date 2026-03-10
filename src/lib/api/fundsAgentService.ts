import { FUNDS_AGENT_API_URL } from "./config";
import {
  conversationListConversations,
  conversationCreateConversation,
  conversationGetConversation,
  conversationGetMessages,
  conversationDeleteConversation,
  conversationGenerateTitle,
} from "./conversationService";

interface AgentConfig {
  whatsapp_allowed_group_ids: string;
}

async function fetchAgentConfig(): Promise<AgentConfig> {
  const response = await fetch(`${FUNDS_AGENT_API_URL}/config`);
  if (!response.ok) return { whatsapp_allowed_group_ids: "" };
  return response.json();
}
import type { MessageResponse, ApiSource, ConversationResponse } from "./client";
import type { ConversationWithMetadata } from "./ragService";

interface FundsAgentQueryRequest {
  query: string;
  conversation_id?: string;
  user_id?: string;
  channel?: string;
}

interface FundsAgentQueryResponse {
  query: string;
  response: string;
  sources: Array<Record<string, unknown>>;
  conversation_id?: string;
}

async function askFundsAgent(
  query: string,
  conversationId?: string
): Promise<FundsAgentQueryResponse> {
  const body: FundsAgentQueryRequest = { query, channel: "frontend_agent" };
  if (conversationId) {
    body.conversation_id = conversationId;
  }

  const response = await fetch(`${FUNDS_AGENT_API_URL}/pipeline/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }
  return response.json();
}

export class FundsAgentService {
  async fetchConversations(
    limit: number = 50
  ): Promise<ConversationWithMetadata[]> {
    const config = await fetchAgentConfig();
    const response = await conversationListConversations(
      limit,
      "funds",
      config.whatsapp_allowed_group_ids || undefined
    );
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
    return conversationCreateConversation(title, user, "funds");
  }

  async getConversation(
    conversationId: string
  ): Promise<ConversationResponse> {
    return conversationGetConversation(conversationId);
  }

  async loadConversationMessages(
    conversationId: string
  ): Promise<MessageResponse[]> {
    const response = await conversationGetMessages(conversationId);
    // Normalize: conversation-service returns "id" not "message_id"
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
        content: typeof msg.content === "string" ? msg.content : String(msg.content ?? ""),
        sources: (msg.sources as ApiSource[] | null) ?? null,
        created_at: createdStr,
      };
    });
  }

  async sendMessage(
    conversationId: string,
    query: string,
    isFirstMessage: boolean = false
  ): Promise<{ userMessage: MessageResponse; assistantMessage: MessageResponse }> {
    const sendTime = new Date().toISOString();
    const queryResponse = await askFundsAgent(query, conversationId);

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

    return {
      userMessage,
      assistantMessage,
    };
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await conversationDeleteConversation(conversationId);
  }
}

export const fundsAgentService = new FundsAgentService();
