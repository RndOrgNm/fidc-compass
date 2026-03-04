export interface ApiError {
  detail: string;
}

export interface ApiSource {
  document_id?: string;
  section_id?: string;
  category?: string;
  page_number?: number;
  section_text?: string;
  [key: string]: any;
}

export interface ConversationCreate {
  title: string;
  user?: string;
}

export interface ConversationResponse {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user?: string;
}

export interface ConversationListResponse {
  conversations: ConversationResponse[];
  total: number;
}

export interface MessageCreate {
  role: "user" | "assistant";
  content: string;
  sources?: ApiSource[];
}

export interface MessageResponse {
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  sources?: ApiSource[] | null;
  created_at: string;
}

export interface ConversationMessagesResponse {
  conversation_id: string;
  messages: MessageResponse[];
  total: number;
}

export interface GenerateTitleRequest {
  query: string;
}
