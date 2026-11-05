import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RUN_EVENTS } from "@/lib/agui/fixtures";
import { configureApiAuth } from "./client";
import { FUNDS_AGENT_API_URL as BASE } from "./config";
import {
  ApiRequestError,
  ThreadBusyError,
  deleteThread,
  getThreadMessages,
  listChatAgents,
  listThreads,
  renameThread,
  runThread,
} from "./threadsService";

const fetchMock = vi.fn();

function reply(body: unknown, status = 200) {
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(body), { status }));
}

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url: url as string, init: init as RequestInit, headers: init.headers as Headers };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  configureApiAuth({ getToken: async () => "tok" });
});

afterEach(() => {
  configureApiAuth();
  vi.unstubAllGlobals();
});

describe("reading", () => {
  it("lists the chat agents of the registry, published and visible in the chat", async () => {
    reply({ agents: [{ id: "a1", name: "Prazos", version: 1 }], total: 1 });
    expect(await listChatAgents()).toEqual([{ id: "a1", name: "Prazos", version: 1 }]);
    expect(lastCall().url).toBe(`${BASE}/agents?published=true&visible_in_chat=true`);
  });

  it("lists the threads, of one agent when asked", async () => {
    reply({ threads: [{ id: "t1" }] });
    expect(await listThreads()).toEqual([{ id: "t1" }]);
    expect(lastCall().url).toBe(`${BASE}/threads`);

    await listThreads("a 1");
    expect(lastCall().url).toBe(`${BASE}/threads?agent_id=a%201`);
  });

  it("reads the messages of a thread from its snapshot", async () => {
    reply({ type: "MESSAGES_SNAPSHOT", messages: [{ id: "u1", role: "user", content: "oi" }] });
    expect(await getThreadMessages("t1")).toEqual([{ id: "u1", role: "user", content: "oi" }]);
    expect(lastCall().url).toBe(`${BASE}/threads/t1/messages`);
  });

  it("sends the token on every call", async () => {
    reply({ threads: [] });
    await listThreads();
    expect(lastCall().headers.get("Authorization")).toBe("Bearer tok");
  });
});

describe("changing", () => {
  it("renames a thread", async () => {
    reply({ id: "t1", title: "Novo" });
    await renameThread("t1", "Novo");
    const { url, init } = lastCall();
    expect(url).toBe(`${BASE}/threads/t1`);
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"title":"Novo"}');
  });

  it("deletes a thread", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await deleteThread("t1");
    expect(lastCall().init.method).toBe("DELETE");
  });

  it("reports an error with what the service said", async () => {
    reply({ detail: "Thread not found" }, 404);
    await expect(deleteThread("x")).rejects.toMatchObject({ status: 404, detail: "Thread not found" });
  });

  it("falls back to the status text when the error has no body to read", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 502, statusText: "Bad Gateway" }));
    await expect(listThreads()).rejects.toMatchObject({ status: 502, detail: "Bad Gateway" });
  });
});

describe("runThread", () => {
  const request = {
    threadId: "t1",
    agentId: "a1",
    messages: [{ id: "u1", role: "user" as const, content: "Como está o FIDC X?" }],
  };

  function streamOf(events: unknown[]) {
    const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
  }

  it("posts the AG-UI input with the agent in the query, and streams the events", async () => {
    fetchMock.mockResolvedValue(streamOf(RUN_EVENTS));
    const events = [];
    for await (const event of await runThread({ ...request, runId: "r1" })) events.push(event);

    expect(events).toEqual(RUN_EVENTS);
    const { url, init, headers } = lastCall();
    expect(url).toBe(`${BASE}/threads/t1/runs?agent_id=a1`);
    expect(init.method).toBe("POST");
    expect(headers.get("Accept")).toBe("text/event-stream");
    expect(headers.get("Authorization")).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual({
      threadId: "t1",
      runId: "r1",
      state: null,
      messages: request.messages,
      tools: [],
      context: [],
      forwardedProps: null,
    });
  });

  it("gives each run an id of its own", async () => {
    fetchMock.mockImplementation(async () => streamOf([]));
    await runThread(request);
    await runThread(request);
    const ids = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).runId);
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("refuses with the id of the run going when the thread is busy", async () => {
    reply({ detail: { message: "busy", running_run_id: "r0" } }, 409);
    const refusal = await runThread(request).catch((e) => e);
    expect(refusal).toBeInstanceOf(ThreadBusyError);
    expect(refusal.runningRunId).toBe("r0");
  });

  it("refuses a thread that belongs to another agent as an ordinary error", async () => {
    reply({ detail: "Thread t1 belongs to agent-1" }, 409);
    const refusal = await runThread(request).catch((e) => e);
    expect(refusal).toBeInstanceOf(ApiRequestError);
    expect(refusal).not.toBeInstanceOf(ThreadBusyError);
    expect(refusal.detail).toBe("Thread t1 belongs to agent-1");
  });
});
