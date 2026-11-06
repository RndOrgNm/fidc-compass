import type { Message } from "@ag-ui/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RUN_EVENTS } from "@/lib/agui/fixtures";
import type { ProposalThread, Thread } from "@/lib/api/threadsService";
import { ProposalChat } from "./ProposalChat";

const service = vi.hoisted(() => ({
  findProposalThread: vi.fn(),
  listThreads: vi.fn(),
  openThreadFromTask: vi.fn(),
  getThread: vi.fn(),
  getThreadMessages: vi.fn(),
  runThread: vi.fn(),
}));
vi.mock("@/lib/api/threadsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/threadsService")>()),
  ...service,
}));

const origin: ProposalThread = {
  thread_id: "task-1",
  until_message_id: "run-1",
  action_id: "act-1",
  kind: "proposal.obrigacao",
  created_at: "2026-11-06T10:00:00Z",
};

const conversation: Thread = {
  id: "t-chat",
  agent_id: "agent-proposal",
  title: null,
  subject_type: "artifact",
  subject_id: "a-1",
  context_from: { thread_id: "task-1", until_message_id: "run-1" },
  created_at: "2026-11-06T10:05:00Z",
  updated_at: "2026-11-06T10:05:00Z",
};

const mark = { inherited: true, from_thread_id: "task-1" };
const history = [
  { id: "task-q", role: "user", content: "Execute a tarefa.", metadata: mark },
  {
    id: "task-a",
    role: "assistant",
    content: "Propus a taxa de administração.",
    toolCalls: [
      { id: "c1", type: "function", function: { name: "onedrive-reader__search_document", arguments: "{}" } },
    ],
    metadata: mark,
  },
  { id: "task-t", role: "tool", toolCallId: "c1", content: "{}", metadata: mark },
] as unknown as Message[];

async function* streamed() {
  for (const event of RUN_EVENTS) yield event;
}

const ICON = { name: /conversar sobre esta proposta/i };

beforeEach(() => {
  Object.values(service).forEach((mock) => mock.mockReset());
  service.findProposalThread.mockResolvedValue(origin);
  service.listThreads.mockResolvedValue([]);
  service.openThreadFromTask.mockResolvedValue(conversation);
  service.getThread.mockResolvedValue(conversation);
  service.getThreadMessages.mockResolvedValue(history);
  service.runThread.mockImplementation(async () => streamed());
});

describe("ProposalChat", () => {
  it("shows nothing for a proposal no task made, and asks by the row the proposal is about", async () => {
    service.findProposalThread.mockResolvedValue(null);

    render(<ProposalChat proposal={{ obrigacaoId: "ob-old" }} />);

    await waitFor(() => expect(service.findProposalThread).toHaveBeenCalledWith({ obrigacaoId: "ob-old" }));
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows nothing when it cannot ask, so the card works without it", async () => {
    service.findProposalThread.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ProposalChat proposal={{ documentoId: "doc-1" }} />);

    await waitFor(() => expect(service.findProposalThread).toHaveBeenCalled());
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the chat icon for a proposal a task made", async () => {
    render(<ProposalChat proposal={{ obrigacaoId: "ob-1" }} />);

    expect(await screen.findByRole("button", ICON)).toBeInTheDocument();
    expect(service.listThreads).not.toHaveBeenCalled();
  });

  it("opens a conversation that continues the task, with what the Agent did in a block of its own", async () => {
    const user = userEvent.setup();
    render(<ProposalChat proposal={{ obrigacaoId: "ob-1" }} />);

    await user.click(await screen.findByRole("button", ICON));

    expect(await screen.findByText("Conversa sobre a proposta")).toBeInTheDocument();
    expect(service.openThreadFromTask).toHaveBeenCalledWith({ thread_id: "task-1", until_message_id: "run-1" });
    expect(service.getThreadMessages).toHaveBeenCalledWith("t-chat");
    expect(await screen.findByText(/O que o Agente fez nesta análise · 1 consulta/)).toBeInTheDocument();
    expect(screen.getByText(/Pergunte o que quiser sobre esta proposta/)).toBeInTheDocument();
  });

  it("goes back to the conversation the person already has about the proposal, not a second one", async () => {
    service.listThreads.mockResolvedValue([
      { ...conversation, id: "t-other", context_from: { thread_id: "task-9", until_message_id: "run-9" } },
      conversation,
    ]);
    const user = userEvent.setup();
    render(<ProposalChat proposal={{ obrigacaoId: "ob-1" }} />);

    await user.click(await screen.findByRole("button", ICON));

    await waitFor(() => expect(service.getThread).toHaveBeenCalledWith("t-chat"));
    expect(service.openThreadFromTask).not.toHaveBeenCalled();
  });

  it("sends the question with the thread's agent and shows the answer as it arrives", async () => {
    const user = userEvent.setup();
    render(<ProposalChat proposal={{ documentoId: "doc-1" }} />);
    await user.click(await screen.findByRole("button", ICON));
    const box = await screen.findByPlaceholderText(/Pergunte sobre a proposta/);
    await waitFor(() => expect(box).toBeEnabled());

    await user.type(box, "De onde veio o 20%?");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("O FIDC X está ok.")).toBeInTheDocument();
    expect(screen.getByText("De onde veio o 20%?")).toBeInTheDocument();
    const [request] = service.runThread.mock.calls[0];
    expect(request.threadId).toBe("t-chat");
    expect(request.agentId).toBe("agent-proposal");
    expect(request.messages).toEqual([expect.objectContaining({ role: "user", content: "De onde veio o 20%?" })]);
    expect(box).toHaveValue("");
  });

  it("sends nothing for an empty question", async () => {
    const user = userEvent.setup();
    render(<ProposalChat proposal={{ obrigacaoId: "ob-1" }} />);
    await user.click(await screen.findByRole("button", ICON));
    await screen.findByPlaceholderText(/Pergunte sobre a proposta/);

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(service.runThread).not.toHaveBeenCalled();
  });
});
