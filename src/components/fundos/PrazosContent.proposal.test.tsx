import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PrazoItem } from "./PrazosContent";
import type { PropostaPrazo } from "@/types/propostas";

/**
 * Covers only the new `proposal` prop on `PrazoItem` — the pre-existing
 * `inst`-driven rendering (real obligations, gatilho editor, etc.) is
 * untouched and not retested here.
 */
const proposta: PropostaPrazo = {
  id: "prazo-prop-1",
  arquivo: { nome: "Contrato_Locacao_Aditivo_03.pdf", paginas: 8 },
  sugestao: {
    topico: "Reajuste anual do aluguel (IPCA)",
    categoria: "OPERACIONAL",
    dataVencimento: "2026-07-01",
    observacao: "Aplicar o IPCA acumulado e notificar o locatário com 30 dias de antecedência.",
    responsaveis: ["João Vitor Castro", "Lucas Revelin"],
  },
  raciocinio: "A cláusula 4.2 fixa reajuste anual pelo IPCA com data-base em 1º de julho.",
  fontes: [{ trecho: "Cláusula 4.2", page: 2, texto: "Reajuste anual pelo IPCA." }],
};

describe("PrazoItem proposal mode", () => {
  it("renders the suggestion and an approve/reject footer while pending", () => {
    render(
      <PrazoItem
        proposal={{ proposta, decision: null, onApprove: () => {}, onReject: () => {}, onUndo: () => {} }}
      />,
    );

    expect(screen.getByText("Reajuste anual do aluguel (IPCA)")).toBeInTheDocument();
    expect(screen.getByText("Operacional")).toBeInTheDocument();
    expect(screen.getByText("João Vitor Castro, Lucas Revelin")).toBeInTheDocument();
    expect(screen.getByText("Proposta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aprovar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rejeitar" })).toBeInTheDocument();
  });

  it("calls onApprove when Aprovar is clicked", async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(
      <PrazoItem proposal={{ proposta, decision: null, onApprove, onReject: () => {}, onUndo: () => {} }} />,
    );

    await user.click(screen.getByRole("button", { name: /aprovar/i }));

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("opens the reject form and forwards the chosen reason", async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(
      <PrazoItem proposal={{ proposta, decision: null, onApprove: () => {}, onReject, onUndo: () => {} }} />,
    );

    await user.click(screen.getByRole("button", { name: "Rejeitar" }));
    await user.click(screen.getByRole("button", { name: "Período incorreto" }));
    await user.click(screen.getByRole("button", { name: /confirmar rejeição/i }));

    expect(onReject).toHaveBeenCalledWith("Período incorreto");
  });

  it("shows 'Criada agora' and a working Desfazer once approved", async () => {
    const onUndo = vi.fn();
    const user = userEvent.setup();
    render(
      <PrazoItem
        proposal={{ proposta, decision: { tipo: "aprovada" }, onApprove: () => {}, onReject: () => {}, onUndo }}
      />,
    );

    expect(screen.getByText("Criada agora")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /desfazer/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("shows the rejection reason and hides the approve/reject footer once rejected", () => {
    render(
      <PrazoItem
        proposal={{
          proposta,
          decision: { tipo: "rejeitada", motivo: "Período incorreto" },
          onApprove: () => {},
          onReject: () => {},
          onUndo: () => {},
        }}
      />,
    );

    expect(screen.getByText("Período incorreto")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aprovar/i })).not.toBeInTheDocument();
  });
});
