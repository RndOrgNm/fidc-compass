import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropostasContent, type DocumentoProposalEntry } from "./PropostasContent";
import type { DocumentoResponse } from "@/lib/api/documentoService";
import type { PropostaPrazo } from "@/types/propostas";

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

const documentoProposals: DocumentoProposalEntry[] = [
  {
    doc,
    contextName: "Imóvel Alpha",
    proposta: {
      id: "doc-prop-1",
      documentoId: "doc-1",
      arquivo: { nome: "Contrato_Social_2026.pdf", paginas: 12 },
      confianca: "alta",
      raciocinio: "Razão social e CNPJ coincidem com o ativo.",
      fontes: [{ trecho: "Identificação", page: 1, texto: "CNPJ 41.208.553/0001-10" }],
    },
  },
];

const prazoProposals: PropostaPrazo[] = [
  {
    id: "prazo-prop-1",
    arquivo: { nome: "Contrato_Locacao_Aditivo_03.pdf", paginas: 8 },
    sugestao: { topico: "Reajuste anual do aluguel (IPCA)", categoria: "OPERACIONAL" },
    raciocinio: "A cláusula 4.2 fixa reajuste anual pelo IPCA.",
    fontes: [{ trecho: "Cláusula 4.2", page: 2, texto: "Reajuste anual pelo IPCA." }],
  },
];

describe("PropostasContent", () => {
  it("shows the empty state when there are no proposals", () => {
    render(<PropostasContent documentoProposals={[]} prazoProposals={[]} />);

    expect(screen.getByText("Nenhuma proposta pendente no momento.")).toBeInTheDocument();
  });

  it("renders one section per proposal kind with its reasoning and count", () => {
    render(<PropostasContent documentoProposals={documentoProposals} prazoProposals={prazoProposals} />);

    expect(screen.getByText("Ativos")).toBeInTheDocument();
    expect(screen.getByText("Prazos")).toBeInTheDocument();
    expect(screen.getByText("Imóvel Alpha")).toBeInTheDocument();
    expect(screen.getByText("Reajuste anual do aluguel (IPCA)")).toBeInTheDocument();
    // Reasoning renders once per pending proposal.
    expect(screen.getByText("Razão social e CNPJ coincidem com o ativo.")).toBeInTheDocument();
    expect(screen.getByText("A cláusula 4.2 fixa reajuste anual pelo IPCA.")).toBeInTheDocument();
  });

  it("hides the reasoning block once a document proposal is decided, keeping the other section intact", async () => {
    const user = userEvent.setup();
    render(<PropostasContent documentoProposals={documentoProposals} prazoProposals={prazoProposals} />);

    await user.click(screen.getByRole("button", { name: /aprovar vínculo/i }));

    expect(screen.queryByText("Razão social e CNPJ coincidem com o ativo.")).not.toBeInTheDocument();
    expect(screen.getByText("Aprovada agora")).toBeInTheDocument();
    // The Prazos section's own proposal is untouched by the Ativos decision.
    expect(screen.getByText("A cláusula 4.2 fixa reajuste anual pelo IPCA.")).toBeInTheDocument();
  });

  it("saves the approval before showing it, and offers no undo once saved", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(
      <PropostasContent
        documentoProposals={documentoProposals}
        prazoProposals={[]}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /aprovar vínculo/i }));

    expect(onApprove).toHaveBeenCalledWith("documento", "doc-prop-1");
    expect(await screen.findByText("Aprovada agora")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /desfazer/i })).not.toBeInTheDocument();
  });

  it("keeps the proposal pending and shows the error when saving fails", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn().mockRejectedValue(new Error("documento não tem proposta pendente"));
    render(
      <PropostasContent
        documentoProposals={documentoProposals}
        prazoProposals={[]}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /aprovar vínculo/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("documento não tem proposta pendente");
    expect(screen.queryByText("Aprovada agora")).not.toBeInTheDocument();
    expect(screen.getByText("Razão social e CNPJ coincidem com o ativo.")).toBeInTheDocument();
  });

  it("saves an obligation approval under the obligation kind", async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn().mockResolvedValue(undefined);
    render(
      <PropostasContent
        documentoProposals={[]}
        prazoProposals={prazoProposals}
        onApprove={onApprove}
        onReject={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /aprovar/i }));

    expect(onApprove).toHaveBeenCalledWith("obrigacao", "prazo-prop-1");
  });

  it("opens the source viewer on the cited text when the proposal has no file to draw", async () => {
    const user = userEvent.setup();
    const withMarker: DocumentoProposalEntry[] = [
      {
        ...documentoProposals[0],
        proposta: {
          ...documentoProposals[0].proposta,
          raciocinio: "Razão social e CNPJ coincidem com o ativo [1].",
        },
      },
    ];
    render(<PropostasContent documentoProposals={withMarker} prazoProposals={[]} />);

    await user.click(screen.getByRole("button", { name: /fonte 1/i }));

    // "Contrato_Social_2026.pdf" now appears twice (the table's file cell and
    // the opened Sheet's title) — assert on the Sheet-only caption instead.
    expect(screen.getByText(/CNPJ 41\.208\.553\/0001-10/)).toBeInTheDocument();
    expect(screen.getByText(/visualização do arquivo não está disponível/i)).toBeInTheDocument();
  });
});
