import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropostaRejectForm } from "./PropostaRejectForm";

describe("PropostaRejectForm", () => {
  it("disables the confirm button until a reason is picked", async () => {
    const user = userEvent.setup();
    render(<PropostaRejectForm onCancel={() => {}} onConfirm={() => {}} />);

    const confirmButton = screen.getByRole("button", { name: /confirmar rejeição/i });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Período incorreto" }));

    expect(confirmButton).toBeEnabled();
  });

  it("calls onConfirm with the selected reason", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<PropostaRejectForm onCancel={() => {}} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Ativo errado" }));
    await user.click(screen.getByRole("button", { name: /confirmar rejeição/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("Ativo errado");
  });

  it("offers 'Agente errou' and 'Outro' besides the other reasons", () => {
    render(<PropostaRejectForm onCancel={() => {}} onConfirm={() => {}} />);

    expect(screen.getByRole("button", { name: "Agente errou" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Outro" })).toBeInTheDocument();
  });

  it("confirms 'Agente errou' with just the reason", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<PropostaRejectForm onCancel={() => {}} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Agente errou" }));
    await user.click(screen.getByRole("button", { name: /confirmar rejeição/i }));

    expect(onConfirm).toHaveBeenCalledWith("Agente errou");
  });

  it("needs a comment for 'Outro' and sends it with the reason", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<PropostaRejectForm onCancel={() => {}} onConfirm={onConfirm} />);
    const confirmButton = screen.getByRole("button", { name: /confirmar rejeição/i });

    await user.click(screen.getByRole("button", { name: "Outro" }));
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Descreva o motivo"), "  Já cadastrada em outro fundo ");
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith("Outro: Já cadastrada em outro fundo");
  });

  it("calls onCancel and never onConfirm when cancelled", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<PropostaRejectForm onCancel={onCancel} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("only one reason chip is active at a time", async () => {
    const user = userEvent.setup();
    render(<PropostaRejectForm onCancel={() => {}} onConfirm={() => {}} />);

    const docErrado = screen.getByRole("button", { name: "Documento errado" });
    const periodoIncorreto = screen.getByRole("button", { name: "Período incorreto" });

    await user.click(docErrado);
    expect(docErrado.className).toContain("border-border/80");

    await user.click(periodoIncorreto);
    expect(periodoIncorreto.className).toContain("border-border/80");
    expect(docErrado.className).not.toContain("border-border/80");
  });
});
