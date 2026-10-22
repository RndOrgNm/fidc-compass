import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropostaReason } from "./PropostaReason";

const fontes = [
  { trecho: "Cláusula 4.2", page: 7, texto: "índice e data-base do reajuste" },
  { trecho: "Anexo II", page: 12, texto: "tabela de amortização" },
];

describe("PropostaReason", () => {
  it("renders the reasoning text and one button per fonte", () => {
    render(
      <PropostaReason
        raciocinio="O arquivo cita o mesmo índice e periodicidade do documento anterior."
        fontes={fontes}
        arquivoNome="Acordo_de_Socios.pdf"
        onOpenSource={() => {}}
      />,
    );

    expect(
      screen.getByText("O arquivo cita o mesmo índice e periodicidade do documento anterior."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Acordo_de_Socios\.pdf/)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(fontes.length);
    expect(screen.getByText("Pág. 7")).toBeInTheDocument();
    expect(screen.getByText("Pág. 12")).toBeInTheDocument();
  });

  it("calls onOpenSource with the clicked fonte", async () => {
    const onOpenSource = vi.fn();
    const user = userEvent.setup();
    render(
      <PropostaReason
        raciocinio="Raciocínio qualquer."
        fontes={fontes}
        arquivoNome="Acordo_de_Socios.pdf"
        onOpenSource={onOpenSource}
      />,
    );

    await user.click(screen.getByText("Anexo II"));

    expect(onOpenSource).toHaveBeenCalledTimes(1);
    expect(onOpenSource).toHaveBeenCalledWith(fontes[1]);
  });

  it("turns each [n] marker in the reasoning into a link to source n", async () => {
    const onOpenSource = vi.fn();
    const user = userEvent.setup();
    render(
      <PropostaReason
        raciocinio="O reajuste é anual [1] e há uma tabela de amortização [2]."
        fontes={fontes}
        arquivoNome="Acordo_de_Socios.pdf"
        onOpenSource={onOpenSource}
      />,
    );

    await user.click(screen.getByRole("button", { name: /fonte 2: anexo ii/i }));

    expect(onOpenSource).toHaveBeenCalledWith(fontes[1]);
    expect(screen.getByText(/O reajuste é anual/)).toBeInTheDocument();
  });

  it("leaves a marker without a matching source as plain text", () => {
    render(
      <PropostaReason
        raciocinio="Conforme a cláusula [9] do contrato."
        fontes={fontes}
        arquivoNome="Acordo_de_Socios.pdf"
        onOpenSource={() => {}}
      />,
    );

    expect(screen.getByText("Conforme a cláusula [9] do contrato.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fonte 9/i })).not.toBeInTheDocument();
  });

  it("shows a page range for a source that spans pages, and no page for a Word source", () => {
    render(
      <PropostaReason
        raciocinio="Texto."
        fontes={[
          { trecho: "Seção longa", page: 3, pageEnd: 4, texto: "…" },
          { trecho: "Parágrafo Word", page: null, texto: "…" },
        ]}
        arquivoNome="x.pdf"
        onOpenSource={() => {}}
      />,
    );

    expect(screen.getByText("Pág. 3–4")).toBeInTheDocument();
    expect(screen.queryByText(/Pág\. null/)).not.toBeInTheDocument();
  });

  it("renders nothing in the fontes row when there are none", () => {
    render(
      <PropostaReason raciocinio="Sem fontes." fontes={[]} arquivoNome="x.pdf" onOpenSource={() => {}} />,
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
