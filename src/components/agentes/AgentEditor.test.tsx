import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentConfig } from "@/lib/agentConfig";

const actions = vi.hoisted(() => ({
  saveDraft: vi.fn(),
  publishDraft: vi.fn(),
  discardDraft: vi.fn(),
}));
vi.mock("@/lib/agentConfigActions", () => actions);

import { AgentEditor } from "./AgentEditor";

function version(n: number, status: "draft" | "published", prompt: string, skill: string) {
  return {
    agent: {
      id: "a1",
      version: n,
      status,
      name: "Proposal",
      description: "d",
      engine: "langgraph",
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      instructions: prompt,
      skills: [{ id: "s1", version: n }],
      mcps: [],
      middlewares: [{ name: "citations", config: {} }],
      output_schema: null,
      visible_in_chat: true,
      created_at: "2026-11-01T00:00:00Z",
      created_by: null,
    },
    skill: {
      id: "s1",
      version: n,
      status,
      name: "Obrigações",
      description: "when",
      instructions: skill,
      active: true,
      created_at: "2026-11-01T00:00:00Z",
      created_by: null,
    },
  };
}

function renderEditor(config: AgentConfig) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AgentEditor config={config} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const inUse: AgentConfig = {
  id: "a1",
  slug: "proposal",
  name: "Proposal",
  description: "d",
  versions: [version(1, "published", "the prompt", "the skill")],
  mcps: [],
};

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset());
  actions.saveDraft.mockResolvedValue(undefined);
});

describe("AgentEditor", () => {
  it("starts from the version in use: nothing to save and nothing to publish", () => {
    renderEditor(inUse);
    expect(screen.getByText("Sem alterações em relação à v1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Publicar v2" })).toBeDisabled();
    expect(screen.getByLabelText("Prompt")).toHaveValue("the prompt");
    expect(screen.getByLabelText("Instruções da skill Obrigações")).toHaveValue("the skill");
  });

  it("a change can be saved, and saving sends what was typed", async () => {
    renderEditor(inUse);
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "a better prompt" } });
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(actions.saveDraft).toHaveBeenCalled());
    expect(actions.saveDraft.mock.calls[0][1]).toMatchObject({ prompt: "a better prompt", skill: "the skill" });
  });

  it("an empty prompt can be saved but not published, and says why", () => {
    renderEditor(inUse);
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "  " } });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Publicar v2" })).toBeDisabled();
    expect(screen.getAllByText(/não pode ficar vazio/).length).toBeGreaterThan(0);
  });

  it("publishing asks first, saying what changes, and then publishes the number it showed", async () => {
    actions.publishDraft.mockResolvedValue({ version: 2 });
    renderEditor(inUse);
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "the prompt\nand a new line" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar v2" }));

    expect(screen.getByText("Publicar a v2?")).toBeInTheDocument();
    expect(screen.getByText(/Execuções em andamento continuam com a v1/)).toBeInTheDocument();
    expect(screen.getByText("+1 −0 linhas")).toBeInTheDocument();
    expect(actions.publishDraft).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: "Publicar v2" }).at(-1)!);
    await waitFor(() => expect(actions.publishDraft).toHaveBeenCalled());
    expect(actions.publishDraft.mock.calls[0][2]).toBe(2);
  });

  it("a refusal of the registry stays in the dialog", async () => {
    const { ApiRequestError } = await import("@/lib/api/threadsService");
    actions.publishDraft.mockRejectedValue(new ApiRequestError(422, "skill s1 version 2 is a draft"));
    renderEditor(inUse);
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar v2" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Publicar v2" }).at(-1)!);
    expect(await screen.findByText(/O registro recusou a publicação: skill s1 version 2 is a draft/)).toBeInTheDocument();
  });

  it("continues a saved draft: its text is in the fields and it is the next number", () => {
    renderEditor({
      ...inUse,
      versions: [version(1, "published", "the prompt", "the skill"), version(2, "draft", "draft prompt", "the skill")],
    });
    expect(screen.getByLabelText("Prompt")).toHaveValue("draft prompt");
    expect(screen.getByText("Rascunho salvo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar v2" })).toBeEnabled();
  });

  it("shows the changes against the version in use", () => {
    renderEditor(inUse);
    fireEvent.change(screen.getByLabelText("Prompt"), { target: { value: "other" } });
    fireEvent.click(screen.getByRole("button", { name: /Mostrar mudanças/ }));
    expect(screen.getByText("Mudanças do rascunho v2 em relação à v1 (em uso)")).toBeInTheDocument();
    expect(screen.getByText("other")).toBeInTheDocument();
  });
});
