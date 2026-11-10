import { describe, expect, it } from "vitest";

import type { AgentVersion, SkillVersion } from "@/lib/api/agentConfigService";
import {
  diffLines,
  draftOf,
  middlewareLabel,
  modelOptionsFor,
  nextVersionOf,
  publishedOf,
  publishedVersions,
  type AgentConfig,
  type VersionView,
} from "./agentConfig";

function skill(version: number, instructions: string, status: "draft" | "published" = "published"): SkillVersion {
  return {
    id: "s1",
    version,
    status,
    name: "Obrigações",
    description: "when it applies",
    instructions,
    active: true,
    created_at: "2026-11-01T00:00:00Z",
    created_by: null,
  };
}

function view(
  version: number,
  status: "draft" | "published",
  prompt: string,
  skillText: string,
  model = "claude-sonnet-5-5",
): VersionView {
  const s = skill(version, skillText, status);
  return {
    skills: [s],
    agent: {
      id: "a1",
      version,
      status,
      name: "Proposal",
      description: "proposes obligations",
      engine: "langgraph",
      provider: "anthropic",
      model,
      instructions: prompt,
      skills: [{ id: "s1", version }],
      mcps: [],
      middlewares: [],
      output_schema: null,
      visible_in_chat: true,
      managed_in_page: true,
      created_at: "2026-11-01T00:00:00Z",
      created_by: null,
    } satisfies AgentVersion,
  };
}

function configOf(...versions: VersionView[]): AgentConfig {
  return { id: "a1", slug: "proposal", name: "Proposal", description: "", versions, mcps: [], models: [] };
}

describe("which version is in use and which is a draft", () => {
  it("the version in use is the latest published one, even with a draft after it", () => {
    const config = configOf(view(1, "published", "p1", "k1"), view(2, "published", "p2", "k2"), view(3, "draft", "p3", "k2"));
    expect(publishedOf(config)?.agent.version).toBe(2);
    expect(draftOf(config)?.agent.version).toBe(3);
    expect(publishedVersions(config).map((v) => v.agent.version)).toEqual([2, 1]);
  });

  it("a draft taken back to what is in use is no draft", () => {
    const config = configOf(view(1, "published", "p1", "k1"), view(2, "draft", "p1", "k1"));
    expect(draftOf(config)).toBeNull();
  });

  it("a draft that changes only the skill's text is a draft", () => {
    const config = configOf(view(1, "published", "p1", "k1"), view(2, "draft", "p1", "k1 changed"));
    expect(draftOf(config)?.agent.version).toBe(2);
  });

  it("a published latest version leaves no draft", () => {
    expect(draftOf(configOf(view(1, "published", "p1", "k1")))).toBeNull();
  });

  it("the next publication is the draft's number, or the one after the latest published", () => {
    expect(nextVersionOf(configOf(view(1, "published", "p", "k")))).toBe(2);
    expect(nextVersionOf(configOf(view(1, "published", "p", "k"), view(2, "draft", "q", "k")))).toBe(2);
  });
});

describe("diffLines", () => {
  it("counts added and removed lines and shows the lines around them", () => {
    const diff = diffLines("a\nb\nc", "a\nB\nc\nd");
    expect(diff.added).toBe(2);
    expect(diff.removed).toBe(1);
    expect(diff.rows.filter((r) => r.kind === "del").map((r) => r.text)).toEqual(["b"]);
    expect(diff.rows.filter((r) => r.kind === "add").map((r) => r.text)).toEqual(["B", "d"]);
  });

  it("folds the lines far from a change into one gap row", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i}`);
    const changed = [...lines];
    changed[10] = "changed";
    const diff = diffLines(lines.join("\n"), changed.join("\n"));
    const gaps = diff.rows.filter((r) => r.kind === "gap");
    expect(gaps).toHaveLength(2);
    expect(gaps[0].text).toBe("8 linhas sem mudança");
  });

  it("has no rows of change for equal texts", () => {
    const diff = diffLines("same\ntext", "same\ntext");
    expect(diff).toMatchObject({ added: 0, removed: 0 });
    expect(diff.rows.every((r) => r.kind !== "add" && r.kind !== "del")).toBe(true);
  });
});

describe("labels", () => {
  it("names a protection in plain words, and shows an unknown one as it is", () => {
    expect(middlewareLabel("refuse_tools")).toBe("Impede aprovar ou rejeitar propostas");
    expect(middlewareLabel("something_new")).toBe("something_new");
  });

  it("keeps the model in use among the options when it is not a known one", () => {
    expect(modelOptionsFor("anthropic", "claude-sonnet-5-5")).toHaveLength(3);
    const options = modelOptionsFor("openai", "gpt-4o-mini");
    expect(options).toHaveLength(4);
    expect(options[0]).toMatchObject({ provider: "openai", model: "gpt-4o-mini" });
  });
});
