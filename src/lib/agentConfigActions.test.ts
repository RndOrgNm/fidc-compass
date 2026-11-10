import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configureApiAuth } from "@/lib/api/client";
import { FUNDS_AGENT_API_URL as BASE } from "@/lib/api/config";
import { ApiRequestError } from "@/lib/api/threadsService";
import type { AgentConfig, VersionView } from "./agentConfig";
import { contentOf } from "./agentConfig";
import { discardDraft, loadAgentConfigs, publishDraft, saveDraft } from "./agentConfigActions";

/** The registry's rows, as the routes answer them. */
let agents: Record<string, unknown>[];
let skills: Record<string, unknown>[];
let calls: string[];
let publishSkillStatus = 200;

const AGENT = { id: "a1", name: "Proposal", description: "d", engine: "langgraph", provider: "anthropic", mcps: ["m1"], middlewares: [{ name: "citations", config: {} }], output_schema: null, visible_in_chat: true, created_at: "2026-11-01T00:00:00Z", created_by: null };
const SKILL = { id: "s1", name: "Obrigações", description: "when", active: true, created_at: "2026-11-01T00:00:00Z", created_by: null };

function agentRow(version: number, status: string, instructions: string, model = "claude-sonnet-5-5", skillVersion = 1) {
  return { ...AGENT, version, status, instructions, model, skills: [{ id: "s1", version: skillVersion }] };
}
function skillRow(version: number, status: string, instructions: string) {
  return { ...SKILL, version, status, instructions };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/** A registry that does what the routes do: a PATCH edits a draft or starts the next one. */
async function route(url: string, init: RequestInit = {}): Promise<Response> {
  const path = url.replace(BASE, "");
  const method = init.method ?? "GET";
  const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
  calls.push(`${method} ${path}${body ? ` ${JSON.stringify(body)}` : ""}`);

  const patch = (rows: Record<string, unknown>[], changes: Record<string, unknown>) => {
    const latest = rows.at(-1)!;
    if (latest.status === "draft") return Object.assign(latest, changes);
    const next = { ...latest, ...changes, version: (latest.version as number) + 1, status: "draft" };
    rows.push(next);
    return next;
  };
  const publish = (rows: Record<string, unknown>[], version: number) => {
    const row = rows.find((r) => r.version === version)!;
    row.status = "published";
    return row;
  };

  if (method === "GET" && path === "/agents") return json({ agents: [agents.at(-1)], total: 1 });
  if (method === "GET" && path === "/agents/a1/versions") return json({ agents: agents, total: agents.length });
  if (method === "GET" && path === "/mcp-servers") return json({ mcp_servers: [{ id: "m1", name: "funds", active: true }, { id: "m2", name: "other", active: true }], total: 2 });
  const skillVersion = path.match(/^\/skills\/s1\/versions\/(\d+)$/);
  if (method === "GET" && skillVersion) return json(skills.find((s) => s.version === Number(skillVersion[1])));
  if (method === "PATCH" && path === "/skills/s1") return json(patch(skills, body));
  if (method === "PATCH" && path === "/agents/a1") return json(patch(agents, body));
  const publishSkillRoute = path.match(/^\/skills\/s1\/versions\/(\d+)\/publish$/);
  if (method === "POST" && publishSkillRoute) {
    return publishSkillStatus === 200
      ? json(publish(skills, Number(publishSkillRoute[1])))
      : json({ detail: "already published" }, publishSkillStatus);
  }
  const publishAgentRoute = path.match(/^\/agents\/a1\/versions\/(\d+)\/publish$/);
  if (method === "POST" && publishAgentRoute) return json(publish(agents, Number(publishAgentRoute[1])));
  return json({ detail: "not found" }, 404);
}

beforeEach(() => {
  agents = [agentRow(1, "published", "prompt 1")];
  skills = [skillRow(1, "published", "skill 1")];
  calls = [];
  publishSkillStatus = 200;
  vi.stubGlobal("fetch", vi.fn(route));
  configureApiAuth({ getToken: async () => "tok" });
});

afterEach(() => {
  configureApiAuth();
  vi.unstubAllGlobals();
});

async function config(): Promise<AgentConfig> {
  const [one] = await loadAgentConfigs();
  return one;
}
const writes = () => calls.filter((c) => !c.startsWith("GET"));

describe("loading", () => {
  it("offers the agents the page owns, with the skill of each version and the servers of the agent", async () => {
    const loaded = await config();
    expect(loaded.slug).toBe("proposal");
    expect(loaded.versions).toHaveLength(1);
    expect(loaded.versions[0].skill?.instructions).toBe("skill 1");
    expect(loaded.mcps.map((m) => m.name)).toEqual(["funds"]);
  });

  it("leaves out an agent the page does not own", async () => {
    agents = [{ ...agentRow(1, "published", "p"), name: "Search" }];
    expect(await loadAgentConfigs()).toEqual([]);
  });
});

describe("saving", () => {
  it("sends the skill's text to the skill and points the new draft at the skill's new version", async () => {
    const loaded = await config();
    await saveDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2", skill: "skill 2" });

    expect(writes()).toEqual([
      `PATCH /skills/s1 ${JSON.stringify({ instructions: "skill 2" })}`,
      `PATCH /agents/a1 ${JSON.stringify({ provider: "anthropic", model: "claude-sonnet-5-5", instructions: "prompt 2", skills: [{ id: "s1", version: 2 }] })}`,
    ]);
    expect(agents.at(-1)).toMatchObject({ version: 2, status: "draft", instructions: "prompt 2" });
  });

  it("does not touch the skill when only the prompt changed", async () => {
    const loaded = await config();
    await saveDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2" });
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toContain("PATCH /agents/a1");
    expect(agents.at(-1)).toMatchObject({ skills: [{ id: "s1", version: 1 }] });
  });

  it("saving twice edits the same draft in place", async () => {
    const first = await config();
    await saveDraft(first, { ...contentOf(first.versions[0]), prompt: "prompt 2" });
    const second = await config();
    await saveDraft(second, { ...contentOf(second.versions[1]), prompt: "prompt 3" });
    expect(agents).toHaveLength(2);
    expect(agents[1]).toMatchObject({ version: 2, instructions: "prompt 3" });
  });
});

describe("publishing", () => {
  it("publishes the skill before the agent that points at it", async () => {
    const loaded = await config();
    const published = await publishDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2", skill: "skill 2" }, 2);

    expect(published).toMatchObject({ version: 2, status: "published" });
    expect(writes().map((c) => c.split(" ").slice(0, 2).join(" "))).toEqual([
      "PATCH /skills/s1",
      "PATCH /agents/a1",
      "POST /skills/s1/versions/2/publish",
      "POST /agents/a1/versions/2/publish",
    ]);
  });

  it("publishes a draft that was already saved without saving it again", async () => {
    const loaded = await config();
    await saveDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2" });
    calls = [];
    const saved = await config();
    await publishDraft(saved, contentOf(saved.versions[1]), 2);
    expect(writes()).toEqual(["POST /agents/a1/versions/2/publish"]);
  });

  it("goes on when someone published the skill in the meantime", async () => {
    const loaded = await config();
    publishSkillStatus = 409;
    await expect(publishDraft(loaded, { ...contentOf(loaded.versions[0]), skill: "skill 2" }, 2)).resolves.toMatchObject({ status: "published" });
  });

  it("publishes nothing when the agent moved on since the dialog was opened", async () => {
    const loaded = await config();
    await expect(publishDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2" }, 3)).rejects.toMatchObject({
      status: 409,
    });
    expect(calls.some((c) => c.includes("/publish"))).toBe(false);
  });

  it("an error of the registry reaches the caller with what it said", async () => {
    const loaded = await config();
    await saveDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2" });
    const saved = await config();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({ detail: ["skill s1 version 1 is a draft", "MCP server m1 is inactive"] }, 422) : route(url, init),
    ));
    const failure = await publishDraft(saved, contentOf(saved.versions[1]), 2).catch((e) => e);
    expect(failure).toBeInstanceOf(ApiRequestError);
    expect(failure.detail).toBe("skill s1 version 1 is a draft; MCP server m1 is inactive");
  });
});

describe("discarding", () => {
  it("takes the draft back to what is in use, and then there is no draft", async () => {
    const loaded = await config();
    await saveDraft(loaded, { ...contentOf(loaded.versions[0]), prompt: "prompt 2", skill: "skill 2" });
    await discardDraft(await config());

    expect(agents.at(-1)).toMatchObject({ version: 2, status: "draft", instructions: "prompt 1", skills: [{ id: "s1", version: 1 }] });
    const after = await config();
    const { draftOf } = await import("./agentConfig");
    expect(draftOf(after)).toBeNull();
  });

  it("does nothing when the latest version is the one in use", async () => {
    await discardDraft(await config());
    expect(writes()).toEqual([]);
  });
});

describe("a version read from the history", () => {
  it("is the content of its own skill version", async () => {
    skills = [skillRow(1, "published", "skill 1"), skillRow(2, "published", "skill 2")];
    agents = [agentRow(1, "published", "prompt 1"), agentRow(2, "published", "prompt 2", "claude-opus-5-5", 2)];
    const loaded = await config();
    const byVersion = (n: number): VersionView => loaded.versions.find((v) => v.agent.version === n)!;
    expect(contentOf(byVersion(1))).toMatchObject({ prompt: "prompt 1", skill: "skill 1", model: "claude-sonnet-5-5" });
    expect(contentOf(byVersion(2))).toMatchObject({ prompt: "prompt 2", skill: "skill 2", model: "claude-opus-5-5" });
  });
});
