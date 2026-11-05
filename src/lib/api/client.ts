/** The part of the Clerk browser object that apiFetch uses. */
interface ClerkBrowser {
  session?: { getToken(): Promise<string | null> } | null;
  redirectToSignIn(): Promise<unknown> | unknown;
}

function clerk(): ClerkBrowser | undefined {
  return (window as unknown as { Clerk?: ClerkBrowser }).Clerk;
}

export interface ApiAuth {
  /** The session token to send, or null when nobody is signed in. */
  getToken: () => Promise<string | null>;
  /** Called once when the backend refuses the token, however many calls fail together. */
  onUnauthorized: () => Promise<unknown> | unknown;
}

const defaultAuth: ApiAuth = {
  getToken: async () => (await clerk()?.session?.getToken()) ?? null,
  onUnauthorized: () => clerk()?.redirectToSignIn(),
};

let auth: ApiAuth = defaultAuth;
let signingIn = false;

/** Replaces how apiFetch gets the token and what a 401 does; with no argument, restores Clerk. */
export function configureApiAuth(next: Partial<ApiAuth> = {}): void {
  auth = { ...defaultAuth, ...next };
  signingIn = false;
}

/**
 * fetch with the Clerk session token in `Authorization: Bearer`. The caller still reads the
 * Response; a 401 also sends the person to the Clerk sign-in, once.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await auth.getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // A string body is JSON here; FormData sets its own boundary and must be left alone.
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && !signingIn) {
    signingIn = true;
    try {
      await auth.onUnauthorized();
    } finally {
      signingIn = false;
    }
  }
  return response;
}

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

/** Live tool-call activity streamed during an in-progress agent turn (see /router/ask/stream). */
export interface ToolActivityEvent {
  type: "tool_start" | "tool_end" | "tool_error" | "progress" | "log" | "text_delta";
  tool?: string;
  message?: string;
  level?: string;
  progress?: number;
  total?: number | null;
  /** Present when type === "text_delta" — one token/chunk of the answer being generated live. */
  text?: string;
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
