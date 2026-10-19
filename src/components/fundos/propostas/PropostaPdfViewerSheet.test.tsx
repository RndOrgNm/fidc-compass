import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PropostaPdfViewerSheet } from "./PropostaPdfViewerSheet";

vi.mock("@/components/PdfViewerCanvas", () => ({
  PdfViewerCanvas: ({
    currentPage,
    onTotalPages,
  }: {
    currentPage: number;
    onTotalPages: (n: number) => void;
  }) => {
    onTotalPages(20);
    return <div data-testid="pdf-canvas">página renderizada: {currentPage}</div>;
  },
}));

const fontes = [
  { trecho: "Cláusula 4.2", page: 7, texto: "índice e data-base do reajuste" },
  { trecho: "Anexo II", page: 12, texto: "tabela de amortização" },
];

describe("PropostaPdfViewerSheet", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("shows a loading state while fileData is not yet available", () => {
    render(
      <PropostaPdfViewerSheet
        open
        onOpenChange={() => {}}
        arquivoNome="Acordo_de_Socios.pdf"
        fileData={null}
        startPage={1}
        fontes={fontes}
      />,
    );

    expect(screen.getByText("Carregando documento...")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-canvas")).not.toBeInTheDocument();
  });

  it("opens directly at startPage and shows the matching fonte caption", () => {
    render(
      <PropostaPdfViewerSheet
        open
        onOpenChange={() => {}}
        arquivoNome="Acordo_de_Socios.pdf"
        fileData={new ArrayBuffer(1)}
        startPage={12}
        fontes={fontes}
      />,
    );

    expect(screen.getByText("página renderizada: 12")).toBeInTheDocument();
    expect(screen.getByText(/tabela de amortização/)).toBeInTheDocument();
    expect(screen.getByText("Página 12 de 20")).toBeInTheDocument();
  });

  it("navigates pages with Anterior/Próxima and clamps at the edges", async () => {
    const user = userEvent.setup();
    render(
      <PropostaPdfViewerSheet
        open
        onOpenChange={() => {}}
        arquivoNome="Acordo_de_Socios.pdf"
        fileData={new ArrayBuffer(1)}
        startPage={1}
        fontes={fontes}
      />,
    );

    const anterior = screen.getByRole("button", { name: /anterior/i });
    const proxima = screen.getByRole("button", { name: /próxima/i });

    expect(anterior).toBeDisabled();

    await user.click(proxima);
    expect(screen.getByText("página renderizada: 2")).toBeInTheDocument();
    expect(anterior).toBeEnabled();

    await user.click(anterior);
    expect(screen.getByText("página renderizada: 1")).toBeInTheDocument();
    expect(anterior).toBeDisabled();
  });

  it("only renders the 'Abrir no OneDrive' button when rawUrl is provided", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PropostaPdfViewerSheet
        open
        onOpenChange={() => {}}
        arquivoNome="Acordo_de_Socios.pdf"
        fileData={new ArrayBuffer(1)}
        startPage={1}
        fontes={fontes}
      />,
    );

    expect(screen.queryByRole("button", { name: /abrir no onedrive/i })).not.toBeInTheDocument();

    rerender(
      <PropostaPdfViewerSheet
        open
        onOpenChange={() => {}}
        arquivoNome="Acordo_de_Socios.pdf"
        fileData={new ArrayBuffer(1)}
        startPage={1}
        fontes={fontes}
        rawUrl="https://onedrive.example/Acordo_de_Socios.pdf"
      />,
    );

    const openButton = screen.getByRole("button", { name: /abrir no onedrive/i });
    await user.click(openButton);

    expect(window.open).toHaveBeenCalledWith(
      "https://onedrive.example/Acordo_de_Socios.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
