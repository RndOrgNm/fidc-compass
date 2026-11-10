import type { Message } from "@ag-ui/core";

import type { ApiSource } from "@/lib/api/client";
import { PASSAGES_ACTIVITY, passagesFromMessages, resolveMarkers, type Citation, type PassageTable } from "./citations";
import { sourcesFromToolResults } from "./sources";

export interface ToolCallView {
  id: string;
  name: string;
  /** The arguments as the model wrote them (JSON text, possibly still arriving). */
  args: string;
  result?: string;
  status: "running" | "done" | "error";
  /** What the tool reported while it ran: its log lines and its latest progress. */
  logs: string[];
  progress?: { current: number; total: number };
}

export interface ActivityView {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

/** One thing the Agent did on the way to its answer, in the order it happened. */
export type ChatStep = { kind: "note"; id: string; text: string } | { kind: "tool"; call: ToolCallView };

export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | {
      kind: "assistant";
      id: string;
      /** The answer: what the Agent wrote in the steps that called no tool. */
      text: string;
      /**
       * What came before the answer: the text the Agent wrote while it called tools ("Vou listar
       * os prazos…") and the calls themselves, in order.
       */
      steps: ChatStep[];
      toolCalls: ToolCallView[];
      activities: ActivityView[];
      /**
       * The numbered sources the answer cites: the `[n]` in `text` points to one. Only the ones cited,
       * from what the service reported the Agent read.
       */
      citations: Citation[];
      /**
       * What the page used to show when the service reported nothing: every passage a search
       * returned, cited or not. Empty once the turn reports the passages it read.
       */
      sources: ApiSource[];
    };

/** The activity_type of what an MCP tool call reports while it runs. */
const MCP_ACTIVITY = "mcp_tool_call";

function textOf(content: unknown): string {
  return typeof content === "string" ? content : "";
}

/**
 * Hands each tool call the report of its own activity: the one whose server and tool make the
 * call's name (`server__tool`), the first still unclaimed when a tool is called more than once.
 */
function attachReports(toolCalls: ToolCallView[], activities: ActivityView[]): void {
  const claimed = new Set<string>();
  for (const activity of activities) {
    if (activity.type !== MCP_ACTIVITY) continue;
    const { server, tool, progress, logs } = activity.content as {
      server?: string;
      tool?: string;
      progress?: { progress: number; total: number | null } | null;
      logs?: { message: string }[];
    };
    const call = toolCalls.find((c) => c.name === `${server}__${tool}` && !claimed.has(c.id));
    if (!call) continue;
    claimed.add(call.id);
    call.logs = (logs ?? []).map((log) => log.message);
    if (progress && progress.total != null) {
      call.progress = { current: progress.progress, total: progress.total };
    }
  }
}

/**
 * What the chat shows for a list of messages: each question, and under it one answer that gathers
 * the turn's tool calls (running until their result arrives), their activity, the text and the
 * sources. The same function renders a run being streamed and a thread read back.
 *
 * The markers of an answer (`[sj6tdsf]`) are resolved against the passages the thread reported the
 * Agent read: by default those of `messages`, or `options.passages` when the messages are only part
 * of the thread (the history a conversation inherited is built apart from the conversation's own).
 */
export function buildChatItems(messages: Message[], options: { passages?: PassageTable } = {}): ChatItem[] {
  const items: ChatItem[] = [];
  const passages = options.passages ?? passagesFromMessages(messages);
  let answer: Extract<ChatItem, { kind: "assistant" }> | null = null;
  let texts: string[] = [];
  let results: string[] = [];

  const close = () => {
    if (!answer) return;
    attachReports(answer.toolCalls, answer.activities);
    const resolved = resolveMarkers(texts.join("\n\n"), passages);
    answer.text = resolved.text;
    answer.citations = resolved.citations;
    // A turn that reports what the Agent read has its sources in `citations`; one that does not (an
    // agent not set up to report it) keeps showing the passages its searches returned.
    const reported = answer.activities.some((activity) => activity.type === PASSAGES_ACTIVITY);
    answer.sources = reported ? [] : sourcesFromToolResults(results);
    answer = null;
    texts = [];
    results = [];
  };

  const openAnswer = (id: string) => {
    if (!answer) {
      answer = {
        kind: "assistant", id, text: "", steps: [], toolCalls: [], activities: [], citations: [], sources: [],
      };
      items.push(answer);
    }
    return answer;
  };

  for (const message of messages) {
    if (message.role === "user") {
      close();
      items.push({ kind: "user", id: message.id, text: textOf(message.content) });
    } else if (message.role === "assistant") {
      const current = openAnswer(message.id);
      const text = textOf(message.content);
      const calls = message.toolCalls ?? [];
      // A step that calls tools is the Agent narrating its work; the answer is what it writes in a
      // step that calls none.
      if (text && calls.length) current.steps.push({ kind: "note", id: message.id, text });
      else if (text) texts.push(text);
      for (const call of calls) {
        const view: ToolCallView = {
          id: call.id,
          name: call.function.name,
          args: call.function.arguments,
          status: "running",
          logs: [],
        };
        current.toolCalls.push(view);
        current.steps.push({ kind: "tool", call: view });
      }
    } else if (message.role === "tool") {
      const call = answer?.toolCalls.find((c) => c.id === message.toolCallId);
      if (call) {
        call.result = textOf(message.content);
        call.status = message.error ? "error" : "done";
      }
      results.push(textOf(message.content));
    } else if (message.role === "activity") {
      openAnswer(message.id).activities.push({
        id: message.id,
        type: message.activityType,
        content: message.content,
      });
    }
  }
  close();
  return items;
}
