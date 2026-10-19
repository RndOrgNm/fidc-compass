import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DocumentTable, type DocumentTableProposal } from "./DocumentTable";
import type { DocumentoResponse } from "@/lib/api/documentoService";
import type { PropostaDocumento } from "@/types/propostas";

/**
 * Covers only the new `proposal` prop — DocumentTable's pre-existing
 * behavior (sorting, pagination, the real row actions) is untouched and not
 * retested here.
 */
const doc: DocumentoResponse = {
  id: "doc-1",
  ativo_id: "ativo-1",
  tipo: "contrato_social",
  cadencia: "mensal",
  periodo_referencia: null,
  status: "pendente",
  vigente_desde: null,
  criado_em: "2026-01-01T00:00:00Z",
  atualizado_em: "2026-01-01T00:00:00Z",
};

const proposta: PropostaDocumento = {
  id: "prop-1",
  documentoId: "doc-1",
  arquivo: { nome: "Acordo_de_Socios_2026.pdf", paginas: 12 },
  confianca: "alta",
  raciocinio: "Razão social e CNPJ coincidem com o ativo.",
  fontes: [{ trecho: "Identificação", page: 1, texto: "CNPJ 41.208.553/0001-10" }],
};

const noop = () => {};

function baseProps(proposal?: DocumentTableProposal) {
  return {
    docs: [doc],
    contextName: "Lote 12",
    orderBy: undefined,
    orderDir: "asc" as const,
    onSortChange: noop,
    onView: noop,
    onEdit: noop,
    onDelete: noop,
    onCreatePrazo: noop,
    onVerPrazo: noop,
    emptyMessage: "",
    proposal,
  };
}

describe("DocumentTable proposal mode", () => {
  it("renders normally when no proposal is passed", () => {
    render(<DocumentTable {...baseProps()} />);

    expect(screen.getByText("nenhum arquivo enviado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /aprovar vínculo/i })).not.toBeInTheDocument();
  });

  it("shows the candidate file and an approve/reject footer while pending", () => {
    render(
      <DocumentTable
        {...baseProps({
          proposta,
          decision: null,
          onApprove: () => {},
          onReject: () => {},
          onUndo: () => {},
        })}
      />,
    );

    expect(screen.getByText("Acordo_de_Socios_2026.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aprovar vínculo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rejeitar/i })).toBeInTheDocument();
    // Row actions (Ver/Editar/Notas/Excluir) are hidden while a decision is pending.
    expect(screen.queryByLabelText("Ver documento")).not.toBeInTheDocument();
  });

  it("calls onApprove when the footer button is clicked", async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentTable
        {...baseProps({ proposta, decision: null, onApprove, onReject: () => {}, onUndo: () => {} })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /aprovar vínculo/i }));

    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it("opens the reject form and forwards the chosen reason", async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentTable
        {...baseProps({ proposta, decision: null, onApprove: () => {}, onReject, onUndo: () => {} })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /rejeitar/i }));
    await user.click(screen.getByRole("button", { name: "Documento errado" }));
    await user.click(screen.getByRole("button", { name: /confirmar rejeição/i }));

    expect(onReject).toHaveBeenCalledWith("Documento errado");
  });

  it("shows the decision label and Desfazer once approved, and calls onUndo", async () => {
    const onUndo = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentTable
        {...baseProps({
          proposta,
          decision: { tipo: "aprovada" },
          onApprove: () => {},
          onReject: () => {},
          onUndo,
        })}
      />,
    );

    expect(screen.getByText("Aprovada agora")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /desfazer/i }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("falls back to the normal file cell once rejected", () => {
    render(
      <DocumentTable
        {...baseProps({
          proposta,
          decision: { tipo: "rejeitada", motivo: "Documento errado" },
          onApprove: () => {},
          onReject: () => {},
          onUndo: () => {},
        })}
      />,
    );

    expect(screen.getByText(/Rejeitada · Documento errado/)).toBeInTheDocument();
    expect(screen.getByText("nenhum arquivo enviado")).toBeInTheDocument();
    expect(screen.queryByText("Acordo_de_Socios_2026.pdf")).not.toBeInTheDocument();
  });
});
