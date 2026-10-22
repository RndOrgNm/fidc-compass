import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PropostaReason } from "./PropostaReason";

const fontes = [
  { trecho: "Cláusula 4.2", page: 7, texto: "índice e data-base do reajuste" },
  { trecho: "Anexo II", page: 12, texto: "tabela de amortização" },
];

describe("PropostaReason", () => {
  it("renders the reasoning text, with no separate list of sources", () => {
    render(
      <PropostaReason
        raciocinio="O arquivo cita o mesmo índice e periodicidade do documento anterior."
        fontes={fontes}
        onOpenSource={() => {}}
      />,
    );

    expect(
      screen.getByText("O arquivo cita o mesmo índice e periodicidade do documento anterior."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/fontes/i)).not.toBeInTheDocument();
  });

  it("turns each [n] marker in the reasoning into a link to source n", async () => {
    const onOpenSource = vi.fn();
    const user = userEvent.setup();
    render(
      <PropostaReason
        raciocinio="O reajuste é anual [1] e há uma tabela de amortização [2]."
        fontes={fontes}
        onOpenSource={onOpenSource}
      />,
    );

    await user.click(screen.getByRole("button", { name: /fonte 2: anexo ii/i }));

    expect(onOpenSource).toHaveBeenCalledTimes(1);
    expect(onOpenSource).toHaveBeenCalledWith(fontes[1]);
    expect(screen.getByText(/O reajuste é anual/)).toBeInTheDocument();
  });

  it("leaves a marker without a matching source as plain text", () => {
    render(
      <PropostaReason
        raciocinio="Conforme a cláusula [9] do contrato."
        fontes={fontes}
        onOpenSource={() => {}}
      />,
    );

    expect(screen.getByText("Conforme a cláusula [9] do contrato.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fonte 9/i })).not.toBeInTheDocument();
  });
});
