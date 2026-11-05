import type { Event, Message } from "@ag-ui/core";

import { readEvents } from "@/lib/agui/sse";
import { FUNDS_AGENT_API_URL } from "./config";
import { apiFetch } from "./client";

/** A chat agent of the registry, as the chat menu needs it. */
export interface ChatAgent {
  id: string;
  name: string;
  description?: string | null;
  version: number;
}

export interface Thread {
  id: string;
  agent_id: string;
  title: string | null;
  subject_type: string | null;
  subject_id: string | null;
  created_at: string;
  updated_at: string;
}

/** The service answered with an error; `detail` is what it said, in text. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "ApiRequestError";
  }
}

/** The thread already has a run going (409), here or in another tab. */
export class ThreadBusyError extends ApiRequestError {
  constructor(
    detail: string,
    readonly runningRunId: string,
  ) {
    super(409, detail);
    this.name = "ThreadBusyError";
  }
}

async function failure(response: Response): Promise<ApiRequestError> {
  let detail: unknown;
  try {
    detail = (await response.json()).detail;
  } catch {
    detail = undefined;
  }
  if (response.status === 409 && detail && typeof detail === "object" && "running_run_id" in detail) {
    const busy = detail as { message?: string; running_run_id: string };
    return new ThreadBusyError(busy.message ?? "The thread already has a run going", busy.running_run_id);
  }
  const text = typeof detail === "string" ? detail : response.statusText || `HTTP ${response.status}`;
  return new ApiRequestError(response.status, text);
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw await failure(response);
  return response.json();
}

export async function listChatAgents(): Promise<ChatAgent[]> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/agents?published=true&visible_in_chat=true`);
  return (await json<{ agents: ChatAgent[] }>(response)).agents;
}

export async function listThreads(agentId?: string): Promise<Thread[]> {
  const query = agentId ? `?agent_id=${encodeURIComponent(agentId)}` : "";
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/threads${query}`);
  return (await json<{ threads: Thread[] }>(response)).threads;
}

export async function renameThread(threadId: string, title: string): Promise<Thread> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/threads/${encodeURIComponent(threadId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
  return json<Thread>(response);
}

export async function deleteThread(threadId: string): Promise<void> {
  const response = await apiFetch(`${FUNDS_AGENT_API_URL}/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await failure(response);
}

/** The messages of a thread, in order, as the AG-UI MESSAGES_SNAPSHOT carries them. */
export async function getThreadMessages(threadId: string): Promise<Message[]> {
  const response = await apiFetch(
    `${FUNDS_AGENT_API_URL}/threads/${encodeURIComponent(threadId)}/messages`,
  );
  return (await json<{ messages: Message[] }>(response)).messages;
}

export interface RunRequest {
  threadId: string;
  agentId: string;
  /** The conversation so far plus the new question, as AG-UI messages. */
  messages: Message[];
  runId?: string;
}

/**
 * Starts a run on a thread (it is created by its first run) and returns its events as they
 * stream. Refusals come before any event: 409 with a run going is a ThreadBusyError.
 */
export async function runThread(request: RunRequest): Promise<AsyncGenerator<Event>> {
  const { threadId, agentId, messages, runId = crypto.randomUUID() } = request;
  const response = await apiFetch(
    `${FUNDS_AGENT_API_URL}/threads/${encodeURIComponent(threadId)}/runs?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: JSON.stringify({
        threadId,
        runId,
        state: null,
        messages,
        tools: [],
        context: [],
        forwardedProps: null,
      }),
    },
  );
  if (!response.ok) throw await failure(response);
  return readEvents(response);
}
