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

  it("calls onOpenSource with the page of the clicked fonte", async () => {
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
    expect(onOpenSource).toHaveBeenCalledWith(12);
  });

  it("renders nothing in the fontes row when there are none", () => {
    render(
      <PropostaReason raciocinio="Sem fontes." fontes={[]} arquivoNome="x.pdf" onOpenSource={() => {}} />,
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
