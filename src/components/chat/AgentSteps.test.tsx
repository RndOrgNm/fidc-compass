import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChatStep } from "@/lib/agui/chatItems";
import { AgentSteps } from "./AgentSteps";

const steps: ChatStep[] = [
  { kind: "note", id: "a1", text: "Vou listar os prazos." },
  { kind: "tool", call: { id: "c1", name: "funds__listar", args: "{}", status: "done", logs: [] } },
];

describe("AgentSteps", () => {
  it("is open while the Agent works, with its notes and calls", () => {
    render(<AgentSteps steps={steps} answered={false} />);
    expect(screen.getByText("Trabalhando…")).toBeInTheDocument();
    expect(screen.getByText("Vou listar os prazos.")).toBeInTheDocument();
    expect(screen.getByText("listar")).toBeInTheDocument();
  });

  it("is closed once the answer is there, and a click opens it", () => {
    render(<AgentSteps steps={steps} answered />);
    expect(screen.getByText("Usou 1 ferramenta")).toBeInTheDocument();
    expect(screen.queryByText("Vou listar os prazos.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Vou listar os prazos.")).toBeInTheDocument();
  });

  it("shows nothing when the Agent took no steps", () => {
    const { container } = render(<AgentSteps steps={[]} answered />);
    expect(container).toBeEmptyDOMElement();
  });
});
